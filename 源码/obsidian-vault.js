/* 示例人物名册 + Obsidian 知识库导出。
 * 名册字段对齐用户现有「人物库」表：姓名/关键词/学校/学部/专业/学历/一句话介绍/教育经历/实习与工作经历/技术栈/其他/备注。
 * 人名与经历全部为虚构演示资料，关系也是虚构的，只用于演示知识库效果。
 * 导出产物：每人一篇 md + 机构/学部/专业/技能/关系各自的索引页 + 总览 MOC + JSON Canvas 画布，全部用 [[双链]] 串起来。
 */
(()=>{'use strict';
const G=typeof window!=='undefined'?window:globalThis;
const VERSION='2026-11-08-obsidian-1';
const uid=()=>((globalThis.crypto&&globalThis.crypto.randomUUID)?globalThis.crypto.randomUUID():'x'+Date.now().toString(36)+Math.random().toString(36).slice(2));
const iso=()=>new Date().toISOString();
const fact=(dim,key,value)=>({id:uid(),dim,key,value,confirmed:true,pinned:true,source:'示例资料 · 已确认（虚构）',quote:'',createdAt:iso()});
const doc=(title,text)=>({id:uid(),title,source:'虚构演示材料',createdAt:iso(),text});

/* ---------- 虚构人物名册（20 人 / 5 个圈子，跨圈有交集） ---------- */
const ROSTER=[
 /* A. 清华 · 智能传播实验室 */
 {name:'傅砚舟',role:'研究员 · 人机交互',relation:'导师',desc:'带实验室做「AI 与人的关系」方向，习惯先问清楚要解决谁的问题。',tags:['人机交互','实验室负责人','学术写作'],
  meta:{school:'清华大学',dept:'未来实验室',major:'设计学',degree:'博士',keywords:['人机交互','研究设计','学术写作'],
   edu:[{period:'2012–2017',school:'清华大学',dept:'美术学院',major:'设计学',degree:'博士'},{period:'2008–2012',school:'浙江大学',dept:'计算机科学与技术学院',major:'工业设计',degree:'本科'}],
   exp:[{period:'2017 至今',org:'清华大学',role:'研究员',note:'负责智能传播交叉课题与实验室日常评审'}],
   stack:['研究设计','访谈编码','Python'],note:'改稿极细，喜欢先看证据再谈结论。'},
  facts:[[0,'职位','清华大学未来实验室 研究员'],[4,'专长','人机交互与智能传播交叉研究'],[5,'任务','筹备年度智能传播工作坊']],
  links:[['导师','沈知行'],['学术合作','苏牧之'],['项目合作','温亦然']],
  docs:[['实验室组会记录 · 示例','这周先把评测口径定下来，再谈模型。不要用感觉判断效果，用可复现的样本说话。']]},

 {name:'沈知行',role:'硕士 · 计算机科学与技术',relation:'同门师兄',desc:'做检索增强生成与多模态内容理解，习惯把研究问题做成能复用的小工具。',tags:['RAG','多模态','开源'],
  meta:{school:'清华大学',dept:'信息科学技术学院',major:'计算机科学与技术',degree:'硕士',keywords:['检索增强','多模态','工程化'],
   edu:[{period:'2021–2024',school:'清华大学',dept:'信息科学技术学院',major:'计算机科学与技术',degree:'硕士'},{period:'2017–2021',school:'北京航空航天大学',dept:'软件学院',major:'软件工程',degree:'本科'}],
   exp:[{period:'2023 暑期',org:'字节跳动',role:'算法实习生',note:'检索召回与离线评测集建设'}],
   stack:['Python','PyTorch','vLLM','LangChain'],note:'写实验记录很勤，接口文档永远最新。'},
  facts:[[0,'职位','硕士在读 · 计算机科学与技术'],[0,'交情','同门师兄，项目里负责召回与评测'],[4,'专长','检索增强生成与多模态检索']],
  links:[['导师','傅砚舟'],['同门','陆清和'],['同门','顾南亭'],['前同事','韩松屿']],
  docs:[['技术札记 · 示例','检索这一层其实是产品问题：用户问一句话，系统要知道他真正想看哪一段。所以我先做样本集，再调模型。']]},

 {name:'温亦然',role:'博士 · 新闻传播学',relation:'项目合作',desc:'研究智能传播与青年文化，擅长把访谈材料整理成能看的结构。',tags:['智能传播','访谈','内容研究'],
  meta:{school:'清华大学',dept:'新闻与传播学院',major:'传播学',degree:'博士',keywords:['智能传播','青年文化','质性研究'],
   edu:[{period:'2020–2025',school:'清华大学',dept:'新闻与传播学院',major:'传播学',degree:'博士'},{period:'2016–2020',school:'复旦大学',dept:'新闻学院',major:'新闻学',degree:'本科'}],
   exp:[{period:'2022 至今',org:'清华大学',role:'助教 / 研究助理',note:'负责访谈设计与编码手册'}],
   stack:['访谈编码','NVivo','写作'],note:'访谈前一定先读对方的公开材料。'},
  facts:[[0,'职位','传播学博士生'],[4,'专长','质性访谈与编码'],[1,'风格','先给结构再给细节，不喜欢空泛判断']],
  links:[['导师','傅砚舟'],['项目合作','白露晞'],['合作','林见微']],
  docs:[['访谈提纲 · 示例','先问他最近一次被算法推荐打动是什么时候，再问为什么。不要一上来就问「你怎么看 AI」。']]},

 {name:'陆清和',role:'硕士 · 统计学',relation:'同门',desc:'把统计口径讲清楚的人，报告里每个数字都能追到来源。',tags:['数据科学','统计','实验设计'],
  meta:{school:'清华大学',dept:'统计与数据科学系',major:'应用统计',degree:'硕士',keywords:['实验设计','因果推断','数据清洗'],
   edu:[{period:'2022–2025',school:'清华大学',dept:'统计与数据科学系',major:'应用统计',degree:'硕士'},{period:'2018–2022',school:'上海交通大学',dept:'数学科学学院',major:'统计学',degree:'本科'}],
   exp:[{period:'2024 暑期',org:'美团',role:'数据分析实习生',note:'到家业务实验平台指标口径梳理'}],
   stack:['R','SQL','Python','Tableau'],note:'做表必带口径说明，讨厌「同比涨了很多」这种话。'},
  facts:[[0,'职位','统计学硕士在读'],[4,'专长','实验设计与指标口径'],[5,'近况','在写毕业设计的数据章节']],
  links:[['同门','沈知行'],['校友','何知白'],['同事','崔雨眠']],
  docs:[['周报 · 示例','本周把留存口径从「次日」统一到「7 日内」，历史数据已重跑，差异主要来自口径而不是策略。']]},

 {name:'顾南亭',role:'本科 · 自动化',relation:'实验室本科生',desc:'动手能力最强的本科生，RoboMaster 战队出身，焊接和调参都干。',tags:['机器人','嵌入式','竞赛'],
  meta:{school:'清华大学',dept:'自动化系',major:'自动化',degree:'本科',keywords:['嵌入式','运动控制','竞赛'],
   edu:[{period:'2022–2026',school:'清华大学',dept:'自动化系',major:'自动化',degree:'本科'}],
   exp:[{period:'2023 至今',org:'清华 RoboMaster 战队',role:'电控组成员',note:'云台控制与视觉联调'}],
   stack:['C','STM32','ROS2','SolidWorks'],note:'遇到问题先量波形，不猜。'},
  facts:[[0,'职位','自动化系本科生'],[4,'专长','嵌入式与运动控制'],[5,'近况','准备 RoboMaster 分区赛']],
  links:[['同门','沈知行'],['竞赛队友','尹长川'],['竞赛队友','秦望舒']],
  docs:[['调试记录 · 示例','云台抖动是供电纹波引起的，换了滤波电容之后 P 值可以往上推两档。']]},

 /* B. 北大 / 计算所 */
 {name:'苏牧之',role:'博士 · 计算机应用技术',relation:'同门师兄',desc:'做分布式训练与推理系统，喜欢把性能数字压到极致。',tags:['系统','分布式','推理优化'],
  meta:{school:'中国科学院大学',dept:'计算技术研究所',major:'计算机应用技术',degree:'博士',keywords:['分布式训练','推理优化','性能工程'],
   edu:[{period:'2019–2025',school:'中国科学院大学',dept:'计算技术研究所',major:'计算机应用技术',degree:'博士'},{period:'2015–2019',school:'北京大学',dept:'信息科学技术学院',major:'计算机科学与技术',degree:'本科'}],
   exp:[{period:'2023–2024',org:'华为 2012 实验室',role:'联合培养',note:'大模型推理加速'}],
   stack:['C++','CUDA','Triton','Kubernetes'],note:'看代码先看 profiling 结果。'},
  facts:[[0,'职位','计算所博士'],[4,'专长','推理加速与显存优化'],[1,'风格','只认数据，不认形容词']],
  links:[['学术合作','傅砚舟'],['同门','白露晞'],['校友','江照野'],['前同事','韩松屿']],
  docs:[['性能报告 · 示例','batch=8 时 KV cache 占了 62% 显存，换成分页管理之后能多塞 3 个并发。']]},

 {name:'白露晞',role:'硕士 · 软件工程',relation:'同门',desc:'把需求拆成能交付的模块，写周报比写代码还认真。',tags:['工程化','需求分析','文档'],
  meta:{school:'北京大学',dept:'信息科学技术学院',major:'软件工程',degree:'硕士',keywords:['需求分析','工程化','文档'],
   edu:[{period:'2022–2025',school:'北京大学',dept:'信息科学技术学院',major:'软件工程',degree:'硕士'},{period:'2018–2022',school:'武汉大学',dept:'计算机学院',major:'软件工程',degree:'本科'}],
   exp:[{period:'2024 暑期',org:'字节跳动',role:'后端开发实习生',note:'内容审核链路的需求与接口'}],
   stack:['TypeScript','Go','PostgreSQL','Figma'],note:'需求没写清楚就不动手。'},
  facts:[[0,'职位','软件工程硕士在读'],[4,'专长','需求拆解与接口设计'],[5,'近况','在准备秋招的系统设计面']],
  links:[['同门','苏牧之'],['项目合作','温亦然'],['实习同事','郑执野']],
  docs:[['需求文档 · 示例','这个功能拆成三步：先能提交，再能查到状态，最后才做批量。别一次做完。']]},

 {name:'江照野',role:'硕士 · 人工智能',relation:'项目合作',desc:'做多模态对齐，讲模型结构的时候喜欢画图。',tags:['多模态','模型结构','论文'],
  meta:{school:'北京大学',dept:'智能学院',major:'人工智能',degree:'硕士',keywords:['多模态对齐','视觉语言','论文复现'],
   edu:[{period:'2022–2025',school:'北京大学',dept:'智能学院',major:'人工智能',degree:'硕士'},{period:'2018–2022',school:'南京大学',dept:'人工智能学院',major:'自动化',degree:'本科'}],
   exp:[{period:'2024',org:'腾讯 AI Lab',role:'研究实习生',note:'图文检索对齐实验'}],
   stack:['PyTorch','Transformers','Python','LaTeX'],note:'复现别人论文前先读附录。'},
  facts:[[0,'职位','人工智能硕士在读'],[4,'专长','图文对齐与检索'],[5,'近况','在赶一篇会议投稿']],
  links:[['校友','苏牧之'],['项目合作','沈知行'],['合作','唐雪见']],
  docs:[['实验日志 · 示例','温度系数调到 0.07 之后 recall@10 涨了两个点，但训练更不稳，得配合 warmup。']]},

 {name:'罗清晏',role:'本科 · 电子信息工程',relation:'校友',desc:'硬件和前端都能上手，做演示 demo 很快。',tags:['硬件','前端','Demo'],
  meta:{school:'北京理工大学',dept:'信息与电子学院',major:'电子信息工程',degree:'本科',keywords:['电路设计','前端','快速原型'],
   edu:[{period:'2022–2026',school:'北京理工大学',dept:'信息与电子学院',major:'电子信息工程',degree:'本科'}],
   exp:[{period:'2024 暑期',org:'小米',role:'硬件测试实习生',note:'射频模块测试与报告'}],
   stack:['Altium','C','JavaScript','Figma'],note:'喜欢先把能跑的东西做出来。'},
  facts:[[0,'职位','电子信息工程本科生'],[4,'专长','电路设计与快速原型'],[5,'近况','在准备电子设计竞赛']],
  links:[['校友','邵星河'],['竞赛队友','顾南亭'],['合作','唐雪见']],
  docs:[['竞赛方案 · 示例','第一版先把功耗压下来，展示效果用手机投屏，不要在现场调试。']]},

 {name:'韩松屿',role:'算法工程师 · 搜索',relation:'前同事',desc:'做搜索排序五年，能把业务指标和模型指标对上。',tags:['搜索','排序','业务指标'],
  meta:{school:'中国科学院大学',dept:'计算技术研究所',major:'计算机技术',degree:'硕士',keywords:['搜索排序','特征工程','A/B 实验'],
   edu:[{period:'2017–2020',school:'中国科学院大学',dept:'计算技术研究所',major:'计算机技术',degree:'硕士'},{period:'2013–2017',school:'哈尔滨工业大学',dept:'计算机科学与技术学院',major:'计算机科学与技术',degree:'本科'}],
   exp:[{period:'2021 至今',org:'华为',role:'算法工程师',note:'搜索排序与实验平台'},{period:'2020–2021',org:'字节跳动',role:'算法工程师',note:'推荐召回'}],
   stack:['Python','Spark','TensorFlow','SQL'],note:'上线前先想好回滚方案。'},
  facts:[[0,'职位','华为 2012 实验室 算法工程师'],[4,'专长','搜索排序与实验设计'],[1,'风格','先问影响面，再谈方案']],
  links:[['前同事','沈知行'],['前同事','苏牧之'],['同事','谢云归']],
  docs:[['评审意见 · 示例','这个改动只影响 3% 的流量，收益再大也不值得冒回滚风险，先做灰度。']]},

 /* C. RoboMaster 战队 */
 {name:'尹长川',role:'工程师 · 机器人',relation:'战队学长',desc:'战队老队长，现在在大疆做整机，讲结构设计一针见血。',tags:['机器人','结构设计','带队'],
  meta:{school:'上海交通大学',dept:'机械与动力工程学院',major:'机械工程',degree:'硕士',keywords:['结构设计','整机集成','带队'],
   edu:[{period:'2019–2022',school:'上海交通大学',dept:'机械与动力工程学院',major:'机械工程',degree:'硕士'},{period:'2015–2019',school:'上海交通大学',dept:'机械与动力工程学院',major:'机械工程',degree:'本科'}],
   exp:[{period:'2022 至今',org:'大疆创新',role:'结构工程师',note:'云台整机结构'}],
   stack:['SolidWorks','ANSYS','CNC'],note:'图纸上省一克，整机上省一天。'},
  facts:[[0,'职位','大疆 结构工程师'],[4,'专长','云台整机结构设计'],[5,'近况','在带新一届战队做赛季规划']],
  links:[['竞赛队友','秦望舒'],['竞赛队友','顾南亭'],['师徒','何知白']],
  docs:[['赛季复盘 · 示例','去年输在维护性：一场比赛换三次弹仓，结构太紧。今年先把可维护性写进设计评审。']]},

 {name:'秦望舒',role:'本科 · 机械工程',relation:'竞赛队友',desc:'负责底盘和弹仓结构，画图快、改图更快。',tags:['机械','底盘','竞赛'],
  meta:{school:'上海交通大学',dept:'机械与动力工程学院',major:'机械工程',degree:'本科',keywords:['底盘设计','弹仓','轻量化'],
   edu:[{period:'2022–2026',school:'上海交通大学',dept:'机械与动力工程学院',major:'机械工程',degree:'本科'}],
   exp:[{period:'2023 至今',org:'上交 RoboMaster 战队',role:'机械组组长',note:'底盘与弹仓结构'}],
   stack:['SolidWorks','KeyShot','3D 打印'],note:'改结构前先算受力。'},
  facts:[[0,'职位','机械组组长（本科）'],[4,'专长','底盘与弹仓结构'],[5,'近况','在赶新底盘的加工件']],
  links:[['竞赛队友','尹长川'],['竞赛队友','顾南亭'],['竞赛队友','邵星河']],
  docs:[['设计说明 · 示例','底盘降低 8mm 换来更低重心，但过台阶会蹭，护板需要重新开模。']]},

 {name:'何知白',role:'硕士 · 控制科学与工程',relation:'竞赛队友',desc:'调 PID 调到凌晨三点的人，现在研究足式机器人步态。',tags:['控制','足式机器人','调参'],
  meta:{school:'浙江大学',dept:'控制科学与工程学院',major:'控制科学与工程',degree:'硕士',keywords:['运动控制','步态规划','系统辨识'],
   edu:[{period:'2022–2025',school:'浙江大学',dept:'控制科学与工程学院',major:'控制科学与工程',degree:'硕士'},{period:'2018–2022',school:'浙江大学',dept:'控制科学与工程学院',major:'自动化',degree:'本科'}],
   exp:[{period:'2023 至今',org:'浙大 足式机器人实验室',role:'研究助理',note:'四足步态与状态估计'}],
   stack:['MATLAB','C++','ROS2','MuJoCo'],note:'参数是调出来的，也是算出来的。'},
  facts:[[0,'职位','控制科学硕士在读'],[4,'专长','运动控制与步态规划'],[1,'风格','给结论前先给曲线']],
  links:[['师徒','尹长川'],['竞赛队友','邵星河'],['校友','陆清和']],
  docs:[['调试笔记 · 示例','落地瞬间的冲击让状态估计飘了 3cm，加了接触检测之后积分漂移才收住。']]},

 {name:'邵星河',role:'本科 · 通信工程',relation:'竞赛队友',desc:'做图传和无线链路，比赛现场最怕他不在。',tags:['通信','图传','硬件'],
  meta:{school:'北京邮电大学',dept:'信息与通信工程学院',major:'通信工程',degree:'本科',keywords:['无线链路','图传','射频'],
   edu:[{period:'2022–2026',school:'北京邮电大学',dept:'信息与通信工程学院',major:'通信工程',degree:'本科'}],
   exp:[{period:'2024 暑期',org:'中兴通讯',role:'射频测试实习生',note:'链路预算与干扰排查'}],
   stack:['ADS','C','Python','示波器'],note:'现场出问题先换线，再怀疑代码。'},
  facts:[[0,'职位','通信工程本科生'],[4,'专长','图传链路与射频调试'],[5,'近况','在测新的 5.8G 图传模块']],
  links:[['竞赛队友','何知白'],['竞赛队友','秦望舒'],['校友','罗清晏']],
  docs:[['现场记录 · 示例','对面机器人一上场我们图传就掉，最后发现是电源共地，加隔离就好。']]},

 {name:'唐雪见',role:'硕士 · 工业设计',relation:'竞赛队友',desc:'把技术讲成人能听懂的话，战队对外材料都出自她手。',tags:['工业设计','可视化','对外表达'],
  meta:{school:'同济大学',dept:'设计创意学院',major:'工业设计',degree:'硕士',keywords:['交互设计','可视化','叙事'],
   edu:[{period:'2022–2025',school:'同济大学',dept:'设计创意学院',major:'工业设计',degree:'硕士'},{period:'2018–2022',school:'江南大学',dept:'设计学院',major:'工业设计',degree:'本科'}],
   exp:[{period:'2024',org:'蔚来汽车',role:'体验设计实习生',note:'车机交互原型'}],
   stack:['Figma','Blender','After Effects'],note:'先写一句话，再画图。'},
  facts:[[0,'职位','工业设计硕士在读'],[4,'专长','交互原型与可视化叙事'],[5,'近况','在准备战队的对外发布材料']],
  links:[['竞赛队友','秦望舒'],['合作','林见微'],['合作','江照野']],
  docs:[['展板文案 · 示例','别写「采用先进算法」，写「它能在 0.3 秒内判断该不该刹车」。']]},

 /* D. 互联网实习圈 */
 {name:'林见微',role:'产品经理 · 内容社区',relation:'实习同事',desc:'做社区产品，最关心用户第二天还会不会回来。',tags:['产品','社区','增长'],
  meta:{school:'复旦大学',dept:'新闻学院',major:'传播学',degree:'硕士',keywords:['社区产品','留存','内容生态'],
   edu:[{period:'2019–2022',school:'复旦大学',dept:'新闻学院',major:'传播学',degree:'硕士'},{period:'2015–2019',school:'厦门大学',dept:'新闻传播学院',major:'广告学',degree:'本科'}],
   exp:[{period:'2022 至今',org:'小红书',role:'产品经理',note:'社区内容分发与创作者工具'}],
   stack:['SQL','Figma','Axure'],note:'先看数据再开评审会。'},
  facts:[[0,'职位','小红书 产品经理'],[4,'专长','社区产品与留存'],[5,'任务','在推创作者冷启动工具']],
  links:[['实习同事','郑执野'],['同事','毛静姝'],['合作','唐雪见'],['合作','温亦然']],
  docs:[['需求评审 · 示例','这个功能解决的是新作者的第一次发布，不是老作者的效率。指标就盯发布成功率。']]},

 {name:'郑执野',role:'前端工程师',relation:'实习同事',desc:'前端性能控，能把首屏压到一秒内。',tags:['前端','性能','工程化'],
  meta:{school:'北京大学',dept:'软件与微电子学院',major:'软件工程',degree:'硕士',keywords:['前端性能','工程化','可视化'],
   edu:[{period:'2020–2023',school:'北京大学',dept:'软件与微电子学院',major:'软件工程',degree:'硕士'},{period:'2016–2020',school:'北京邮电大学',dept:'计算机学院',major:'计算机科学与技术',degree:'本科'}],
   exp:[{period:'2023 至今',org:'字节跳动',role:'前端工程师',note:'内容中台与性能优化'}],
   stack:['TypeScript','React','Vite','WebGL'],note:'先量再优化，别凭感觉加缓存。'},
  facts:[[0,'职位','字节跳动 前端工程师'],[4,'专长','前端性能与可视化'],[1,'风格','直接给方案，少寒暄']],
  links:[['实习同事','白露晞'],['实习同事','林见微'],['同事','崔雨眠']],
  docs:[['性能报告 · 示例','首屏 1.8s，主要是三张首图没做响应式。换成 avif + 预加载能干到 0.9s。']]},

 {name:'谢云归',role:'数据分析师',relation:'同事',desc:'做增长分析，报表能自己讲故事。',tags:['数据分析','增长','报表'],
  meta:{school:'中国人民大学',dept:'统计学院',major:'应用统计',degree:'硕士',keywords:['增长分析','漏斗','报表自动化'],
   edu:[{period:'2020–2023',school:'中国人民大学',dept:'统计学院',major:'应用统计',degree:'硕士'},{period:'2016–2020',school:'中山大学',dept:'数学学院',major:'统计学',degree:'本科'}],
   exp:[{period:'2023 至今',org:'腾讯',role:'数据分析师',note:'内容业务增长分析'}],
   stack:['SQL','Python','Tableau','Hive'],note:'报表要能回答「然后呢」。'},
  facts:[[0,'职位','腾讯 数据分析师'],[4,'专长','漏斗分析与报表自动化'],[5,'近况','在做季度增长复盘']],
  links:[['同事','韩松屿'],['同事','毛静姝'],['合作','陆清和']],
  docs:[['复盘摘要 · 示例','新增用户的次日留存掉了 2 个点，集中在低线城市安卓机，怀疑是首屏加载。']]},

 {name:'毛静姝',role:'内容运营',relation:'合作',desc:'做社区运营，擅长把一场活动做成可复用模板。',tags:['运营','活动','内容'],
  meta:{school:'中国传媒大学',dept:'广告学院',major:'广告学',degree:'本科',keywords:['活动运营','内容策划','社群'],
   edu:[{period:'2019–2023',school:'中国传媒大学',dept:'广告学院',major:'广告学',degree:'本科'}],
   exp:[{period:'2023 至今',org:'快手',role:'内容运营',note:'创作者活动与社群运营'}],
   stack:['Excel','剪映','Photoshop'],note:'活动先想清楚怎么收尾。'},
  facts:[[0,'职位','快手 内容运营'],[4,'专长','活动策划与社群运营'],[5,'近况','在筹备年末创作者大会']],
  links:[['同事','谢云归'],['实习同事','林见微'],['合作','唐雪见']],
  docs:[['活动方案 · 示例','一场活动的价值不在当天热度，而在结束后还有多少人继续发内容。']]},

 {name:'崔雨眠',role:'算法工程师 · 推荐',relation:'同事',desc:'做推荐冷启动，喜欢用最笨的基线先跑通。',tags:['推荐','冷启动','召回'],
  meta:{school:'浙江大学',dept:'计算机科学与技术学院',major:'计算机科学与技术',degree:'硕士',keywords:['推荐系统','冷启动','特征工程'],
   edu:[{period:'2020–2023',school:'浙江大学',dept:'计算机科学与技术学院',major:'计算机科学与技术',degree:'硕士'},{period:'2016–2020',school:'西安交通大学',dept:'电子与信息学部',major:'计算机科学与技术',degree:'本科'}],
   exp:[{period:'2023 至今',org:'美团',role:'算法工程师',note:'推荐冷启动与多样性'}],
   stack:['Python','PyTorch','Spark','Redis'],note:'基线跑不通就别谈模型结构。'},
  facts:[[0,'职位','美团 推荐算法工程师'],[4,'专长','冷启动与多样性控制'],[1,'风格','先跑基线，再看论文']],
  links:[['同事','陆清和'],['同事','郑执野'],['校友','何知白']],
  docs:[['实验记录 · 示例','冷启动先用热门兜底，把 CTR 抬起来再换模型，不然新用户根本没有正样本。']]}
];

/* ---------- 名册转成应用内人物对象 ---------- */
const DIM={身份:0,习惯:1,雷区:2,需求:3,背景:4,近况:5};
function toPerson(r){
 const p={id:uid(),name:r.name,role:r.role,relation:r.relation,desc:r.desc,tags:(r.tags||[]).slice(),demo:true,createdAt:iso(),docs:[],facts:[],
  meta:{school:r.meta.school,dept:r.meta.dept,major:r.meta.major,degree:r.meta.degree,keywords:(r.meta.keywords||[]).slice(),
   edu:(r.meta.edu||[]).map(x=>({...x})),exp:(r.meta.exp||[]).map(x=>({...x})),stack:(r.meta.stack||[]).slice(),note:r.meta.note||''},
  links:(r.links||[]).map(([type,to])=>({type,to}))};
 p.docs=(r.docs||[]).map(([title,text])=>doc(title,text));
 p.facts=(r.facts||[]).map(([dim,key,value])=>fact(dim,key,value));
 return p;
}
let cache=null;
function roster(){if(!cache)cache=ROSTER.map(toPerson);return cache.map(p=>JSON.parse(JSON.stringify(p)))}

/* ---------- 导出：Obsidian 知识库 ---------- */
const BAD=/[\\/:*?"<>|#\[\]^]/g;
const safeName=s=>String(s||'').replace(BAD,' ').replace(/\s+/g,' ').trim().slice(0,60)||'未命名';
// 历史数据里 updatedAt/createdAt 可能是毫秒时间戳（数字），统一转成 YYYY-MM-DD。
const dateOnly=v=>{
 const fallback=iso().slice(0,10);
 if(v==null||v==='')return fallback;
 if(typeof v==='number'&&isFinite(v)){const d=new Date(v);return isNaN(d)?fallback:d.toISOString().slice(0,10)}
 const s=String(v);
 if(/^\d{4}-\d{2}-\d{2}/.test(s))return s.slice(0,10);
 const d=new Date(s);return isNaN(d)?fallback:d.toISOString().slice(0,10);
};
const yamlValue=v=>{
 const s=String(v??'');
 if(s==='')return '""';
 if(/^[\w\u4e00-\u9fa5./-]+$/.test(s)&&!/^(true|false|null|yes|no|\d+)$/i.test(s))return s;
 return JSON.stringify(s);
};
const yamlList=a=>(a&&a.length?'['+a.map(x=>yamlValue(x)).join(', ')+']':'[]');
const link=(name,alias)=>alias&&alias!==name?`[[${name}|${alias}]]`:`[[${name}]]`;
/* 关键词走 Obsidian 标签而不是笔记，避免几十个只有一行的小笔记把图谱切碎。 */
const tagOf=v=>{const s=String(v||'').replace(/[\s#\/]+/g,'-').replace(/[\[\]|]/g,'').trim();return s?'#'+s:'#未分类'};
const oneLine=s=>String(s||'').replace(/\s*\n+\s*/g,' ').trim();
const tableCell=s=>oneLine(s).replace(/\|/g,'\\|')||'—';

function build(people){
 const list=(people||[]).filter(p=>p&&p.name);
 const used=new Set();const nameOf=new Map();
 const claim=base=>{let n=safeName(base),i=2;while(used.has(n))n=safeName(base)+'（'+i+++'）';used.add(n);return n};
 // 人物笔记名先占位，保证机构/技能不会抢到同名
 const personNote=new Map();
 for(const p of list)personNote.set(p.id,claim(p.name));
 const orgNote=new Map(),deptNote=new Map(),majorNote=new Map(),skillNote=new Map(),relNote=new Map();
 const noteFor=(map,raw)=>{const k=safeName(raw);if(!map.has(k))map.set(k,claim(raw));return map.get(k)};
 const S=(p,k,f)=>(p.meta&&p.meta[k]!==undefined&&p.meta[k]!==''?p.meta[k]:f!==undefined?f:'');

 // 汇总
 const orgPeople=new Map(),deptPeople=new Map(),majorPeople=new Map(),skillPeople=new Map(),relPairs=new Map();
 const orgDepts=new Map(),orgMajors=new Map(),deptMajors=new Map();
 // 先把「教育经历 / 工作经历」里出现过的机构、学部、专业也登记成笔记并挂上人，
 // 否则人物笔记里的 [[北京航空航天大学]] 会变成断链、机构页也只有 0 人。
 for(const p of list){
  const name=personNote.get(p.id);
  const rows=[[S(p,'school'),S(p,'dept'),S(p,'major')],
   ...(p.meta?.edu||[]).map(e=>[e.school,e.dept,e.major]),
   ...(p.meta?.exp||[]).map(e=>[e.org,'',''])];
  for(const [o,d,m] of rows){
   if(o){noteFor(orgNote,o);if(!orgPeople.has(safeName(o)))orgPeople.set(safeName(o),new Set());orgPeople.get(safeName(o)).add(name)}
   if(d){noteFor(deptNote,d);if(!deptPeople.has(safeName(d)))deptPeople.set(safeName(d),new Set());deptPeople.get(safeName(d)).add(name)}
   if(m){noteFor(majorNote,m);if(!majorPeople.has(safeName(m)))majorPeople.set(safeName(m),new Set());majorPeople.get(safeName(m)).add(name)}
  }
 }
 const touch=(map,key)=>{if(!key)return null;const k=safeName(key);if(!map.has(k))map.set(k,new Set());return map.get(k)};
 for(const p of list){
  const name=personNote.get(p.id);
  const school=S(p,'school'),dept=S(p,'dept'),major=S(p,'major');
  (touch(orgPeople,school)||{add(){}}).add(name);
  (touch(deptPeople,dept)||{add(){}}).add(name);
  (touch(majorPeople,major)||{add(){}}).add(name);
  for(const s of (p.meta?.stack||[])){(touch(skillPeople,s)||{add(){}}).add(name)}
  if(school&&dept){const k=safeName(school);if(!orgDepts.has(k))orgDepts.set(k,new Set());orgDepts.get(k).add(dept)}
  if(school&&major){const k=safeName(school);if(!orgMajors.has(k))orgMajors.set(k,new Set());orgMajors.get(k).add(major)}
  if(dept&&major){const k=safeName(dept);if(!deptMajors.has(k))deptMajors.set(k,new Set());deptMajors.get(k).add(major)}
  for(const e of (p.meta?.edu||[])){
   (touch(orgPeople,e.school)||{add(){}}).add(name);
   if(e.school&&e.dept){const k=safeName(e.school);if(!orgDepts.has(k))orgDepts.set(k,new Set());orgDepts.get(k).add(e.dept)}
  }
  for(const e of (p.meta?.exp||[])){(touch(orgPeople,e.org)||{add(){}}).add(name)}
 }
 // 关系（双向补全）
 const relOf=new Map(list.map(p=>[p.id,[]]));
 const byName=new Map(list.map(p=>[p.name,p]));
 for(const p of list){
  for(const l of (p.links||[])){
   const q=byName.get(l.to);if(!q)continue;
   const type=safeName(l.type||'关联');
   if(!relPairs.has(type))relPairs.set(type,[]);
   relPairs.get(type).push([personNote.get(p.id),personNote.get(q.id)]);
   const addRel=(pid,type,to,id)=>{const rows=relOf.get(pid);if(!rows.some(r=>r.type===type&&r.id===id))rows.push({type,to,id})};
   addRel(p.id,type,q.name,q.id);
   if(!(q.links||[]).some(x=>x.to===p.name&&safeName(x.type||'关联')===type))addRel(q.id,type,p.name,p.id);
  }
 }
 for(const type of relPairs.keys())noteFor(relNote,type);
 // 只有被两个人以上共用的技能才单独建笔记，个人的冷门工具留成正文，避免图谱被碎叶子撑满
 for(const [s,names] of skillPeople)if(names.size>=2)noteFor(skillNote,s);
 for(const s of deptPeople.keys())noteFor(deptNote,s);
 for(const s of majorPeople.keys())noteFor(majorNote,s);
 for(const s of orgPeople.keys())noteFor(orgNote,s);

 const files=[];
 /* 全部文件放进同一个顶层文件夹，解压后就是「一个文件夹」，可以直接整只拖进 Obsidian 库。 */
 const ROOT=safeName('小王知识库');
 const add=(path,text)=>files.push({path:ROOT+'/'+path,text});
 const stats={people:list.length,orgs:orgNote.size,depts:deptNote.size,majors:majorNote.size,skills:skillNote.size,relations:relNote.size,links:0};

 /* 人物笔记 */
 for(const p of list){
  const note=personNote.get(p.id);
  const school=S(p,'school'),dept=S(p,'dept'),major=S(p,'major'),degree=S(p,'degree');
  const kws=(p.meta?.keywords||[]),stack=(p.meta?.stack||[]);
  const lines=[];
  lines.push('---');
  lines.push('类型: 人物');
  lines.push('姓名: '+yamlValue(p.name));
  lines.push('别名: '+yamlList([p.name]));
  if(school)lines.push('学校: '+yamlValue(school));
  if(dept)lines.push('学部: '+yamlValue(dept));
  if(major)lines.push('专业: '+yamlValue(major));
  if(degree)lines.push('学历: '+yamlValue(degree));
  lines.push('身份: '+yamlValue(p.role||''));
  lines.push('关系: '+yamlValue(p.relation||''));
  if(kws.length)lines.push('关键词: '+yamlList(kws));
  if(stack.length)lines.push('技术栈: '+yamlList(stack));
  const tags=['人物'];
  if(degree)tags.push('学历/'+degree);
  if(school)tags.push('学校/'+school);
  if(p.tags&&p.tags.length)tags.push(...p.tags.map(t=>'标签/'+t));
  lines.push('tags: '+yamlList(tags));
  lines.push('更新: '+dateOnly(p.updatedAt||p.createdAt));
  lines.push('示例人物: '+(p.demo?'true':'false'));
  lines.push('---','');
  lines.push('# '+p.name,'');
  if(p.desc)lines.push('> '+oneLine(p.desc),'');
  lines.push('## 基本信息','');
  if(p.role)lines.push('- **身份**：'+p.role);
  if(p.relation)lines.push('- **与我的关系**：'+p.relation);
  if(school)lines.push('- **学校**：'+link(orgNote.get(safeName(school))));
  if(dept)lines.push('- **学部 / 院系**：'+link(deptNote.get(safeName(dept))));
  if(major)lines.push('- **专业**：'+link(majorNote.get(safeName(major))));
  if(degree)lines.push('- **学历**：'+degree);
  if(kws.length)lines.push('- **关键词**：'+kws.map(tagOf).join(' · '));
  if(stack.length)lines.push('- **技术栈**：'+stack.map(k=>{const n=skillNote.get(safeName(k));return n?link(n):'`'+k+'`'}).join(' · '));
  if(p.tags&&p.tags.length)lines.push('- **应用内标签**：'+p.tags.join(' · '));
  lines.push('');
  const edu=(p.meta?.edu||[]).filter(x=>x.school||x.major);
  if(edu.length){
   lines.push('## 教育经历','','| 时间 | 学校 | 学部 / 院系 | 专业 | 学历 |','| --- | --- | --- | --- | --- |');
   for(const e of edu)lines.push(`| ${tableCell(e.period)} | ${e.school?link(orgNote.get(safeName(e.school))):'—'} | ${e.dept?link(deptNote.get(safeName(e.dept))):'—'} | ${e.major?link(majorNote.get(safeName(e.major))):'—'} | ${tableCell(e.degree)} |`);
   lines.push('');
  }
  const exp=(p.meta?.exp||[]).filter(x=>x.org||x.role);
  if(exp.length){
   lines.push('## 实习与工作经历','','| 时间 | 机构 | 角色 | 说明 |','| --- | --- | --- | --- |');
   for(const e of exp)lines.push(`| ${tableCell(e.period)} | ${e.org?link(orgNote.get(safeName(e.org))):'—'} | ${tableCell(e.role)} | ${tableCell(e.note)} |`);
   lines.push('');
  }
  const rels=relOf.get(p.id)||[];
  if(rels.length){
   stats.links+=rels.length;
   lines.push('## 关系网络','');
   for(const r of rels)lines.push(`- ${link(r.id?personNote.get(r.id):r.to)} — ${r.type}`);
   lines.push('','> 关系是双向的：对方笔记里也能看到这条边。','');
  }
  const facts=(p.facts||[]).filter(f=>f&&f.value);
  if(facts.length){
   lines.push('## 档案信息','','| 维度 | 条目 | 内容 | 来源 |','| --- | --- | --- | --- |');
   const dimName=i=>['身份','习惯','雷区','需求','背景','近况'][i]||'其他';
   for(const f of facts)lines.push(`| ${dimName(typeof f.dim==='number'?f.dim:0)} | ${tableCell(f.key)} | ${tableCell(f.value)} | ${tableCell(f.source||'—')} |`);
   lines.push('');
  }
  const docs=(p.docs||[]).filter(d=>d&&d.text);
  if(docs.length){
   lines.push('## 语料摘录','');
   for(const d of docs.slice(0,6)){
    lines.push('### '+oneLine(d.title||'未命名语料'),'');
    lines.push('> '+oneLine(d.text).slice(0,600),'');
   }
  }
  if(p.meta?.note)lines.push('## 备注','',p.meta.note,'');
  lines.push('## 反查','','- 所属机构：'+(school?link(orgNote.get(safeName(school))):'—'));
  lines.push('- 人物总览：'+link('人物总览'),'');
  add('人物/'+note+'.md',lines.join('\n'));
 }

 /* 机构笔记 */
 for(const [key,names] of orgPeople){
  const note=orgNote.get(key);
  const depts=orgDepts.get(key)||new Set(),majors=orgMajors.get(key)||new Set();
  const body=['---','类型: 机构','名称: '+yamlValue(key),'关联人数: '+names.size,'tags: '+yamlList(['机构']),'---','','# '+key,'',
   `> 机构笔记 · 关联 ${names.size} 人`,''];
  if(depts.size)body.push('## 相关学部 / 院系','',[...depts].map(d=>'- '+link(deptNote.get(safeName(d))||d)).join('\n'),'');
  if(majors.size)body.push('## 相关专业','',[...majors].map(d=>'- '+link(majorNote.get(safeName(d))||d)).join('\n'),'');
  body.push('## 相关人物','');
  for(const n of names)body.push('- '+link(n));
  body.push('','## 反查','','- 人物总览：'+link('人物总览'),'');
  add('机构/'+note+'.md',body.join('\n'));
 }

 /* 学部 / 专业 / 技能 / 关系 */
 for(const [key,names] of deptPeople){
  const note=deptNote.get(key);const majors=deptMajors.get(key)||new Set();
  const body=['---','类型: 学部','名称: '+yamlValue(key),'tags: '+yamlList(['学部']),'---','','# '+key,'',`> 学部 / 院系笔记 · 关联 ${names.size} 人`,''];
  if(majors.size)body.push('## 相关专业','',[...majors].map(m=>'- '+link(majorNote.get(safeName(m))||m)).join('\n'),'');
  body.push('## 相关人物','',[...names].map(n=>'- '+link(n)).join('\n'),'');
  add('学部/'+note+'.md',body.join('\n'));
 }
 for(const [key,names] of majorPeople){
  const note=majorNote.get(key);
  add('专业/'+note+'.md',['---','类型: 专业','名称: '+yamlValue(key),'tags: '+yamlList(['专业']),'---','','# '+key,'',`> 专业笔记 · 关联 ${names.size} 人`,'','## 相关人物','',[...names].map(n=>'- '+link(n)).join('\n'),''].join('\n'));
 }
 for(const [key,names] of skillPeople){
  const note=skillNote.get(key);
  if(!note)continue;
  add('技能/'+note+'.md',['---','类型: 技能','名称: '+yamlValue(key),'tags: '+yamlList(['技能']),'---','','# '+key,'',`> 技能笔记 · 关联 ${names.size} 人`,'','## 会这项的人','',[...names].map(n=>'- '+link(n)).join('\n'),''].join('\n'));
 }
 for(const [type,pairs] of relPairs){
  const note=relNote.get(type);
  const uniq=[...new Set(pairs.map(([a,b])=>[a,b].sort().join('|')))].map(x=>x.split('|'));
  const body=['---','类型: 关系','名称: '+yamlValue(type),'tags: '+yamlList(['关系']),'---','','# '+type,'',`> 关系笔记 · ${uniq.length} 组「${type}」关系`,'','## 关系清单',''];
  for(const [a,b] of uniq)body.push(`- ${link(a)} ⇄ ${link(b)}`);
  body.push('');
  add('关系/'+note+'.md',body.join('\n'));
 }

 /* 人物总览 MOC */
 const moc=['---','类型: 索引','tags: '+yamlList(['索引','MOC']),'---','','# 人物总览','',
  `> ${stats.people} 位人物 · ${stats.orgs} 个机构 · ${stats.depts} 个学部 · ${stats.majors} 个专业 · ${stats.skills} 项技能 · ${stats.relations} 类关系`,'',
  '## 按学校分组',''];
 const bySchool=new Map();
 for(const p of list){const s=S(p,'school')||'未标注学校';if(!bySchool.has(s))bySchool.set(s,[]);bySchool.get(s).push(p)}
 for(const [s,ps] of [...bySchool].sort((a,b)=>b[1].length-a[1].length)){
  moc.push('### '+(orgNote.has(safeName(s))?link(orgNote.get(safeName(s))):s),'');
  for(const p of ps)moc.push(`- ${link(personNote.get(p.id))} — ${tableCell(p.role||'')} · ${tableCell(p.relation||'')}`);
  moc.push('');
 }
 moc.push('## 全部人物','','| 姓名 | 学校 | 学部 | 专业 | 学历 | 一句话介绍 |','| --- | --- | --- | --- | --- | --- |');
 for(const p of list){
  const s=S(p,'school'),d=S(p,'dept'),m=S(p,'major'),g=S(p,'degree');
  moc.push(`| ${link(personNote.get(p.id))} | ${s&&orgNote.has(safeName(s))?link(orgNote.get(safeName(s))):tableCell(s)} | ${d&&deptNote.has(safeName(d))?link(deptNote.get(safeName(d))):tableCell(d)} | ${m&&majorNote.has(safeName(m))?link(majorNote.get(safeName(m))):tableCell(m)} | ${tableCell(g)} | ${tableCell(p.desc)} |`);
 }
 moc.push('','## 按技能找人','');
 for(const [k,names] of [...skillPeople].sort((a,b)=>b[1].size-a[1].size)){
  if(!skillNote.has(k))continue;
  moc.push(`- ${link(skillNote.get(k))}：${[...names].map(n=>link(n)).join('、')}`);
 }
 moc.push('','## 按关系找人','');
 for(const [type,pairs] of relPairs){
  const people=new Set();pairs.forEach(([a,b])=>{people.add(a);people.add(b)});
  moc.push(`- ${link(relNote.get(type))}：${[...people].map(n=>link(n)).join('、')}`);
 }
 moc.push('','## 机构一览','',[...orgPeople.keys()].map(k=>'- '+link(orgNote.get(k))).join('\n'),'');
 add('00-索引/人物总览.md',moc.join('\n'));

 /* 索引说明 */
 add('00-索引/怎么用.md',['---','类型: 说明','tags: '+yamlList(['索引','说明']),'---','','# 怎么用这份知识库','',
  '1. 解压后，把整个 `小王知识库` 文件夹拖进 Obsidian 库（或直接放到已有库的任意子目录）。',
  '2. 打开 [[人物总览]]，从人名点进去；每篇人物笔记顶部是 YAML 属性，标签、学校、技能都可筛选。',
  '3. 打开 `关系画布.canvas`（Obsidian 1.4+）能看到一张可拖动的实体关系图；按 `⌘G` 打开全局图谱看整张网。',
  '4. 关系是双向的：A 的笔记里出现 B，B 的笔记里也会出现 A，所以反链面板天然成对。','',
  '> 人物均为虚构演示资料，仅用于展示知识库结构与图谱效果。',''].join('\n'));

 /* README */
 add('README.md',['# 小王知识库（Obsidian）','',
  `由小王「人物库」导出 · ${new Date().toISOString().slice(0,10)}`,'',
  `- 人物 ${stats.people} 篇，机构 ${stats.orgs} 篇，学部 ${stats.depts} 篇，专业 ${stats.majors} 篇，技能 ${stats.skills} 篇，关系 ${stats.relations} 篇。`,
  '- 全部链接使用 Obsidian 双链语法，拖进 Obsidian 后自动建立反链与图谱。',
  '- 示例人物为虚构资料，可用于演示，不要当作真实简历。',''].join('\n'));

 /* JSON Canvas 画布 */
 try{
  const nodes=[],edges=[];
  const personIds=new Map();
  const cols=Math.max(3,Math.ceil(Math.sqrt(list.length)));
  list.forEach((p,i)=>{
   const nid='p'+i;personIds.set(p.id,nid);
   nodes.push({id:nid,type:'file',file:'人物/'+personNote.get(p.id)+'.md',
    x:400+(i%cols)*380,y:520+Math.floor(i/cols)*240,width:320,height:130,color:'#4f6bed'});
  });
  let oi=0;
  for(const key of orgPeople.keys()){
   nodes.push({id:'o'+oi,type:'file',file:'机构/'+orgNote.get(key)+'.md',x:80+oi*360,y:80,width:300,height:110,color:'#e0a33e'});
   oi++;
  }
  let si=0;
  for(const key of skillNote.keys()){
   nodes.push({id:'s'+si,type:'file',file:'技能/'+skillNote.get(key)+'.md',x:80+si*250,y:80+Math.ceil(oi/6)*160+200,width:220,height:90,color:'#3aa981'});
   si++;
  }
  let ei=0;
  const has=new Set();
  for(const p of list){
   const school=S(p,'school');
   if(school&&orgPeople.has(safeName(school))){
    const idx=[...orgPeople.keys()].indexOf(safeName(school));
    const e={id:'e'+(ei++),fromNode:personIds.get(p.id),fromSide:'top',toNode:'o'+idx,toSide:'bottom',color:'#e0a33e'};
    if(!has.has(e.fromNode+e.toNode)){has.add(e.fromNode+e.toNode);edges.push(e)}
   }
   for(const r of (relOf.get(p.id)||[])){
    const a=personIds.get(p.id),b=personIds.get(r.id);if(!a||!b)continue;
    const k=[a,b].sort().join('-');if(has.has(k))continue;has.add(k);
    edges.push({id:'e'+(ei++),fromNode:a,fromSide:'right',toNode:b,toSide:'left',color:'#8a94a6'});
   }
  }
  add('关系画布.canvas',JSON.stringify({nodes,edges},null,1));
 }catch(e){}

 files.sort((a,b)=>a.path.localeCompare(b.path,'zh'));
 return {files,stats,root:ROOT};
}

/* ---------- 打包成 zip（store，不压缩；中文名走 UTF-8 标记） ---------- */
let crcTable=null;
function crc32(buf){
 if(!crcTable){crcTable=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);crcTable[n]=c>>>0}}
 let c=0xFFFFFFFF;
 for(let i=0;i<buf.length;i++)c=crcTable[(c^buf[i])&0xFF]^(c>>>8);
 return (c^0xFFFFFFFF)>>>0;
}
function zipStore(files){
 const enc=new TextEncoder();const locals=[];const centrals=[];let offset=0;
 for(const f of files){
  const name=enc.encode(f.path);const data=enc.encode(f.text);const crc=crc32(data);
  // 0x7075 = Info-ZIP Unicode Path。macOS 自带的 unzip 不认通用标志位里的 UTF-8 标记，
  // 只有这个扩展字段才会按 UTF-8 还原文件名，否则中文目录会变乱码。
  const extra=new Uint8Array(9+name.length);const xv=new DataView(extra.buffer);
  xv.setUint16(0,0x7075,true);xv.setUint16(2,5+name.length,true);extra[4]=1;
  xv.setUint32(5,crc32(name),true);extra.set(name,9);
  const head=new Uint8Array(30+name.length+extra.length);const dv=new DataView(head.buffer);
  dv.setUint32(0,0x04034b50,true);dv.setUint16(4,20,true);dv.setUint16(6,0x0800,true);
  dv.setUint16(8,0,true);dv.setUint16(10,0,true);dv.setUint16(12,0x0021,true);
  dv.setUint32(14,crc,true);dv.setUint32(18,data.length,true);dv.setUint32(22,data.length,true);
  dv.setUint16(26,name.length,true);dv.setUint16(28,extra.length,true);
  head.set(name,30);head.set(extra,30+name.length);
  locals.push(head,data);
  const cen=new Uint8Array(46+name.length+extra.length);const cv=new DataView(cen.buffer);
  cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x0800,true);
  cv.setUint16(10,0,true);cv.setUint16(12,0,true);cv.setUint16(14,0x0021,true);
  cv.setUint32(16,crc,true);cv.setUint32(20,data.length,true);cv.setUint32(24,data.length,true);
  cv.setUint16(28,name.length,true);cv.setUint16(30,extra.length,true);cv.setUint16(32,0,true);
  cv.setUint16(34,0,true);cv.setUint16(36,0,true);cv.setUint32(38,0,true);cv.setUint32(42,offset,true);
  cen.set(name,46);cen.set(extra,46+name.length);centrals.push(cen);
  offset+=head.length+data.length;
 }
 const centralSize=centrals.reduce((n,b)=>n+b.length,0);
 const end=new Uint8Array(22);const ev=new DataView(end.buffer);
 ev.setUint32(0,0x06054b50,true);ev.setUint16(8,files.length,true);ev.setUint16(10,files.length,true);
 ev.setUint32(12,centralSize,true);ev.setUint32(16,offset,true);
 const all=[...locals,...centrals,end];
 const total=all.reduce((n,b)=>n+b.length,0);const out=new Uint8Array(total);
 let p=0;for(const b of all){out.set(b,p);p+=b.length}
 return out;
}

const api={VERSION,roster,build,zip:zipStore};
G.XWObsidian=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})();
