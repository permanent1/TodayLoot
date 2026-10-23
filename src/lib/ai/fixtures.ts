import type { Dimensions, Mode, Persona, VisionResult } from '@/types';

export interface MockFixture {
  id:
    | 'cup'
    | 'keyboard'
    | 'shoes'
    | 'mug'
    | 'plant'
    | 'camera'
    | 'tote'
    | 'earbuds'
    | 'yogurt'
    | 'mouse';
  name: string;
  category: string;
  scene: string;
  features: string[];
  tags: string[];
  dimensions: Dimensions;
  valueScore: number;
  hunt: string;
  keep: string;
  story: string;
  origin: string;
}

const base: Dimensions = {
  rarity: 50,
  surprise: 50,
  value: 50,
  aesthetic: 50,
  craft: 50,
  story: 50,
  condition: 50,
  bond: 50,
};

export const MOCK_FIXTURES: MockFixture[] = [
  {
    id: 'cup',
    name: '不锈钢保温杯',
    category: '饮水器具',
    scene: '办公室桌面',
    features: ['拉丝不锈钢杯身', '杯口有细小磕痕', '密封圈略有磨损'],
    tags: ['metal', 'desk'],
    dimensions: { ...base, rarity: 62, surprise: 58, value: 66, aesthetic: 54, craft: 72, story: 61, condition: 44, bond: 70 },
    valueScore: 46,
    hunt: '一只被会议、加班和深夜热水反复征用的保温杯。杯身像小型装甲，杯盖的密封圈已经学会了在关键时刻漏一点气。',
    keep: '杯口那几道细小的磕痕，是它陪你搬过三次工位的证据。它不保温一整天，但总能保温到你想起喝水的那一刻。',
    story: '它最早出现在一间朝北的办公室，跟着主人换过三张桌子。杯底还留着某次加班时烫出的浅色圆印。',
    origin: '档案记载，这只杯子曾短暂担任过一只仓鼠的水塔，后因漏水被撤职。',
  },
  {
    id: 'keyboard',
    name: '蓝白机械键盘',
    category: '桌面设备',
    scene: '工作台',
    features: ['蓝白双色键帽', '空格键使用痕迹明显', '白色外壳有一处浅划痕'],
    tags: ['desk', 'metal'],
    dimensions: { ...base, rarity: 68, surprise: 63, value: 70, aesthetic: 74, craft: 78, story: 66, condition: 58, bond: 64 },
    valueScore: 52,
    hunt: '一台把每一次敲击都变成小型烟花的机械键盘。蓝白配色的键帽已经磨出一点温润的光，说明它见过太多“最后一次改稿”。',
    keep: '键帽上的油光不是脏，是时间亲手抛出的包浆。你敲过的每个字，都在这里留下了一点温度。',
    story: '它陪主人写完过一份又一份文档。最忙的那个月，回车键的声音曾被邻居误认为装修。',
    origin: '据说它曾在深夜自动打出过一句“明天一定早睡”，至今无人承认。',
  },
  {
    id: 'yogurt',
    name: '希腊风味酸奶',
    category: '食品',
    scene: '办公室桌面',
    features: ['深蓝色旋盖', '白色瓶身印花', '净含量 230g'],
    tags: ['round', 'desk'],
    dimensions: { ...base, rarity: 54, surprise: 66, value: 40, aesthetic: 62, craft: 52, story: 58, condition: 84, bond: 60 },
    valueScore: 28,
    hunt: '一瓶在工位上等待被想起的酸奶。瓶身的希腊柱纹路很努力地优雅，但它的真实用途是撑过下午三点的会议。',
    keep: '它没有留下来，但它留下的空瓶被用来插过一支笔。那支笔后来写完了你转正后的第一份周报。',
    story: '它从便利店冷柜一路被拎回办公室，中途经历了两次电梯与一次临时改需求。',
    origin: '档案备注：它是本周第三瓶被“先放着待会儿喝”的酸奶，前两瓶下落不明。',
  },
  {
    id: 'mouse',
    name: '白色无线鼠标',
    category: '数码外设',
    scene: '书桌 · 鼠标垫',
    features: ['米白色亮面外壳', '滚轮为银色', '底壳有防滑贴'],
    tags: ['desk', 'round'],
    dimensions: { ...base, rarity: 60, surprise: 54, value: 62, aesthetic: 70, craft: 68, story: 56, condition: 64, bond: 62 },
    valueScore: 42,
    hunt: '一只被掌心焐得温润的无线鼠标。外壳的高光很新，但右键已经比左键软了一点，这是长期点“确认”的代价。',
    keep: '它陪你在同一张绿色鼠标垫上滑过很多个夜晚。高光里映出的不是灯，是那些没说出口的“再改一版”。',
    story: '它换过一次电池，也曾在一次搬家后失踪三天，最后在电脑包侧袋里被找到。',
    origin: '档案记载，它曾在深夜误触过一次关机键，从此被主人温柔地称为“小罪人”。',
  },
  {
    id: 'shoes',
    name: '米白帆布鞋',
    category: '鞋履',
    scene: '玄关',
    features: ['米白色帆布鞋面', '鞋头有折痕', '鞋底边缘磨得发亮'],
    tags: ['fabric', 'round'],
    dimensions: { ...base, rarity: 58, surprise: 55, value: 50, aesthetic: 66, craft: 60, story: 74, condition: 40, bond: 80 },
    valueScore: 38,
    hunt: '一双把城市地图写进鞋底的帆布鞋。鞋头的折痕非常诚实，属于那种“说好只走两站路”的下午。',
    keep: '鞋底磨得发亮的地方，正好是你走路时最用力的那一点。它替你记住了一些你早就忘记的路。',
    story: '它第一次出门是去一条有梧桐树的街。后来鞋带换过两次，鞋垫换过一次，路却一直是同一条。',
    origin: '据不可靠记载，这双鞋曾在雨天救过一只蜗牛，并因此获得过一枚不存在的奖章。',
  },
  {
    id: 'mug',
    name: '手工陶瓷马克杯',
    category: '陶瓷器皿',
    scene: '厨房',
    features: ['釉面有细密开片', '杯把略不对称', '杯底留着手作痕'],
    tags: ['round', 'desk'],
    dimensions: { ...base, rarity: 72, surprise: 60, value: 68, aesthetic: 80, craft: 82, story: 70, condition: 62, bond: 66 },
    valueScore: 58,
    hunt: '一只拒绝完美的陶瓷杯。杯把的不对称不是失误，是它对你比“标准答案”更感兴趣。',
    keep: '釉面上的开片像一张慢慢展开的地图。每一条细纹都需要很多次冷热交替，急不来。',
    story: '它出自一间小型工作室。烧制那天窑温不太稳定，于是杯身多了一圈别人没有的浅纹。',
    origin: '档案称，窑工曾在杯底许愿，希望它遇见一个愿意每天用它喝水的人。',
  },
  {
    id: 'plant',
    name: '多肉植物',
    category: '植物',
    scene: '窗台',
    features: ['叶片肥厚', '盆土表面有颗粒', '叶尖带一点红'],
    tags: ['plant', 'round'],
    dimensions: { ...base, rarity: 64, surprise: 62, value: 56, aesthetic: 76, craft: 48, story: 72, condition: 82, bond: 74 },
    valueScore: 44,
    hunt: '一株用沉默完成所有工作的多肉。它不加班，不内耗，只在阳光下把自己慢慢养成一个小胖子。',
    keep: '它长得极慢，慢到一个季节只够长出一圈新叶。可你回头看时，它已经换了一个模样。',
    story: '它曾经只有拇指大小，被放在一只酸奶杯里。现在花盆换了三次，叶尖也终于晒出了红色。',
    origin: '据记载，它的第一片叶子来自一株活了很久的老多肉，算得上是植物界名门之后。',
  },
  {
    id: 'camera',
    name: '胶片相机',
    category: '光学器材',
    scene: '木柜',
    features: ['金属机顶有磨痕', '取景窗有细灰', '镜头环刻度清晰'],
    tags: ['metal', 'round'],
    dimensions: { ...base, rarity: 80, surprise: 72, value: 74, aesthetic: 78, craft: 84, story: 82, condition: 50, bond: 68 },
    valueScore: 64,
    hunt: '一台不肯立刻给你结果的相机。它坚持把惊喜延迟到冲洗店开门的那一刻，脾气很大，但很浪漫。',
    keep: '机顶的磨痕来自无数次举起它。它记录过别人的婚礼、猫的午睡，也记录过你不太擅长告别的那一年。',
    story: '它上一卷胶片停在某个夏天的海边，最后一张是空的。主人说，有些画面留着不拍反而更清楚。',
    origin: '传说它对阴天有特殊偏好，快门声在雨天会轻一点。此说法未获证实。',
  },
  {
    id: 'tote',
    name: '旧帆布托特包',
    category: '包袋',
    scene: '门厅挂钩',
    features: ['米色帆布材质', '提手有轻微起毛', '内侧有笔迹'],
    tags: ['fabric'],
    dimensions: { ...base, rarity: 60, surprise: 54, value: 48, aesthetic: 62, craft: 54, story: 80, condition: 46, bond: 84 },
    valueScore: 34,
    hunt: '一只把生活吞进去又没打算吐出来的托特包。它装过电脑、面包、充电线，以及一株临时买的绿植。',
    keep: '包内侧那几道笔迹是某次急着记电话留下的。它不值钱，但你每次找不到东西时，都会先想起它。',
    story: '它陪主人去过菜市场、美术馆和一次说走就走的短途旅行。肩带内侧的颜色比外面浅一点。',
    origin: '据本店杜撰，它曾在一次搬家过程中保护了一整盒鸡蛋，立下赫赫战功。',
  },
  {
    id: 'earbuds',
    name: '入耳式蓝牙耳机',
    category: '电子产品',
    scene: '随身口袋',
    features: ['白色充电盒', '盒盖有细微划痕', '耳塞有使用痕迹'],
    tags: ['round', 'metal'],
    dimensions: { ...base, rarity: 66, surprise: 58, value: 72, aesthetic: 64, craft: 76, story: 60, condition: 56, bond: 62 },
    valueScore: 50,
    hunt: '一副替你屏蔽世界、也经常被世界弄丢的耳机。充电盒的划痕记录了它和钥匙共处一袋的全部历史。',
    keep: '它每天陪你走路、等车、发呆。你不一定记得听过什么，但那些路上的空白，都是它陪过的。',
    story: '左耳那只曾经在洗衣机边缘被救回，主人因此第一次认真整理了外套口袋。',
    origin: '档案备注：它声称自己能听见地铁里的秘密，但电量通常不允许它说完。',
  },
];

const PERSONA_FLAVOR: Record<Persona, { hunt: string; keep: string }> = {
  zhou: {
    hunt: '老周把眼镜往下推了推：东西是正经东西，就是有点太会过日子了。',
    keep: '老周说，先别急着擦，痕迹留着才有话说。',
  },
  k: {
    hunt: '小 K 记录完毕：结构完整，使用痕迹清晰，情绪价值高于参数价值。',
    keep: '小 K 只补充了一句：测量会出错，陪伴不会。',
  },
  ali: {
    hunt: '阿黎当场站上椅子：这不是日用品，这是被生活亲手盖章的孤品！',
    keep: '阿黎轻声说，它没有变旧，只是把时间留在了自己身上。',
  },
};

const HUNT_AFFIXES = ['包浆候选', '功能尚存', '日常孤品', '磨损美学', '办公遗物'];
const KEEP_AFFIXES = ['岁月留痕', '长期陪伴', '手作余温', '可修复体', '私人记忆'];

export function buildMockVision(params: {
  fixture: MockFixture;
  mode: Mode;
  persona: Persona;
  bountyIds: string[];
  noteLength: number;
  rng: () => number;
}): VisionResult {
  const { fixture, mode, persona, bountyIds, noteLength, rng } = params;
  const flavor = PERSONA_FLAVOR[persona];

  const dimensions: Dimensions = {
    ...fixture.dimensions,
    surprise: Math.min(100, fixture.dimensions.surprise + (mode === 'hunt' ? 2 : 0)),
    bond: Math.min(100, fixture.dimensions.bond + (mode === 'keep' ? 4 : 0)),
    condition: Math.max(20, fixture.dimensions.condition + Math.round(rng() * 6) - 3),
  };

  const bounty_match = [false, false, false] as [boolean, boolean, boolean];
  bountyIds.slice(0, 3).forEach((id, index) => {
    bounty_match[index] = fixture.tags.includes(id);
  });

  const pool = mode === 'hunt' ? HUNT_AFFIXES : KEEP_AFFIXES;
  const first = pool[Math.floor(rng() * pool.length)];
  const second = pool[(Math.floor(rng() * pool.length) + 2) % pool.length];
  const affixes = Array.from(new Set([first, second])).slice(0, 2);

  const desc = `${fixture[mode]}\n\n${mode === 'hunt' ? flavor.hunt : flavor.keep}`;
  const bonus = noteLength > 4 ? Math.min(mode === 'hunt' ? 8 : 12, 3 + Math.floor(noteLength / 10)) : 0;

  return {
    name: fixture.name,
    category: fixture.category,
    scene: fixture.scene,
    visibleFeatures: fixture.features,
    desc,
    dimensions,
    valueScore: Math.min(100, fixture.valueScore + Math.round(rng() * 8) - 4),
    affixes,
    broadcast: `${fixture.name}，档案已录入零号鉴定局。`,
    bounty_match,
    description_bonus: bonus,
    description_credibility: noteLength > 0 ? 'honest' : null,
    image3d_prompt: `一只${fixture.name}，${fixture.category}，${fixture.scene}，单体，写实风格，纯色背景`,
    origin: mode === 'keep' ? fixture.origin : undefined,
    story: mode === 'keep' ? fixture.story : undefined,
    monologue:
      mode === 'keep'
        ? `${flavor.keep} 它今天也被好好看了一遍。`
        : undefined,
    signature: mode === 'keep' ? `零号鉴定局 · ${persona === 'zhou' ? '老周' : persona === 'k' ? '小 K' : '阿黎'}代笔` : undefined,
  };
}
