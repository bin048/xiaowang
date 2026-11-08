"""Explicit opt-in actual macOS Electron lifecycle test, using an isolated synthetic queue."""
import os,time,signal
from pathlib import Path
from test_service import TransportTests,m,event

class RestartTests(TransportTests):
 def test_no_launcher_preserves_offline_error(self):
  self.assertEqual(self.req('/api/desktop-control','POST',{'visible':True},role='h5')[0],409)
 def test_actual_electron_quit_and_restart(self):
  executable=os.environ.get('XW_TEST_ELECTRON')
  if not executable:self.skipTest('set XW_TEST_ELECTRON for actual desktop test')
  launcher=m.DesktopLauncher(executable,Path(__file__).resolve().parents[1]/'Electron悬浮入口',self.temp.name)
  self.a.launcher=launcher
  def wait(predicate):
   end=time.monotonic()+18
   while time.monotonic()<end:
    if predicate():return
    time.sleep(.15)
   self.fail('real desktop confirmation timed out')
  def control(visible):
   status,_,body=self.req('/api/desktop-control','POST',{'visible':visible},role='h5');self.assertEqual(status,202)
   wait(lambda:self.a.desktop_online() and self.a.desktop_visible is visible and self.a.desktop_applied==body['command_id'])
  try:
   item=self.req('/api/deliver','POST',event())[2]
   self.assertEqual(self.req('/api/desktop-control','POST',{'visible':True},role='h5',token=False)[0],401)
   self.assertIsNone(launcher.child)
   self.assertEqual(self.req('/api/desktop-control','POST',{'visible':True,'command':'anything'},role='h5')[0],400)
   self.assertIsNone(launcher.child)
   control(True);first=launcher.child.pid
   control(False);control(True);self.assertEqual(launcher.child.pid,first)
   for _ in range(3):
    previous=launcher.child.pid;launcher.child.send_signal(signal.SIGTERM);launcher.child.wait(timeout=10)
    self.assertFalse(self.a.desktop_online())
    (Path(self.temp.name)/'停止悬浮.flag').write_text('stop')
    control(True);self.assertNotEqual(launcher.child.pid,previous)
   self.assertEqual(self.a.store.get(item['event']['event_id'])['status'],'queued')
   self.assertEqual(self.req('/api/desktop-control','POST',{'visible':True},role='h5',origin='https://evil.invalid')[0],403)
  finally:
   if launcher.child and launcher.child.poll() is None:launcher.child.terminate();launcher.child.wait(timeout=10)

if __name__=='__main__':
 import unittest
 unittest.main(verbosity=2)
