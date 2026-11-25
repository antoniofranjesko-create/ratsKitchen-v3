// Art prompts shared by gen_art.js (command line) and the /art page on the server.
const SEED = 4211;
const STYLE = 'bold cartoon illustration, thick black ink outlines, flat bright colours, gritty grungy paper texture, night market back alley kitchen, playing card art, no text, no letters, no border';
const RAT = 'a single rat, side view, on all fours, no clothing, no weapon, alone, slightly grotesque, raw pink tail and feet';
const BREED = {
  grill: 'Rex rat with curly wavy brown fur',
  cold: 'hairless rat with bald pink wrinkly skin',
  pantry: 'Dumbo rat with very large round ears set low on the sides of its head, grey fur',
  none: 'scruffy grey sewer rat',
};
const RATS = {
  plain: 'ordinary street rat on cobblestones',
  fat: 'very fat round rat with a big belly',
  hog: 'greedy rat with a pig-like snout eating from a food bowl',
  runner: 'rat sprinting fast with speed lines',
  breeder: 'mother rat with two tiny baby rats beside her',
  scav: 'scavenging rat carrying a playing card in its mouth',
  toll: 'rat sitting on a small pile of gold coins',
  alpha: 'big muscular scarred rat, the boss of the alley',
  feral: 'wild feral rat with spiky bristling fur and red eyes',
  spice: 'rat next to a red chilli pepper, flushed red cheeks',
  grub: 'grubby rat surrounded by little maggots and flies',
  sewer: 'rat behind a rusty drain grate with green sewer water',
  ratato: 'a potato shaped like a rat, with rat ears, tail and eyes',
};
const SCENES = {
  sched1: 'a cute round grey heron health inspector holding a clipboard, staring at a rat',
  sched2: 'a cute round grey heron health inspector with a clipboard pointing at two rats',
  snap: 'a cute round grey heron health inspector snapping a photo with a camera flash, surprise',
  snapmole: 'a cute pink naked mole rat inspector jumping out with a camera flash, surprise',
  mole: 'a cute pink naked mole rat inspector with big front teeth holding a magnifying glass',
  sparemole: 'a cute pink naked mole rat with big front teeth, sitting',
  poach: 'a fishing hook on a line lifting a rat out of a kitchen',
  fight: 'two rats squabbling over a scrap of food, dust cloud',
  klepto: 'a gloved hand snatching a playing card from a fan of cards',
  quente: 'a rat being thrown through the air over a flaming stove',
  hotratato: 'a steaming hot potato with rat ears sitting in flames',
  muzzle: 'a rat wearing a leather muzzle',
  disease: 'a sick green rat surrounded by cartoon germs',
  chilli: 'a giant red chilli pepper with a lit fuse like a bomb',
  territorial: 'a striped yellow and black road barrier with rat footprints',
  inherit: 'an old paper scroll will with a red wax seal',
  boardup: 'a kitchen window boarded up with wooden planks and nails',
  lastresort: 'a silver cloche dish on a plate with a rat tail sticking out',
  backdoor: 'a kitchen back door left ajar at night, a rat tail slipping out',
  cat: 'a cute round ginger cat sitting proudly, guarding, big green eyes',
  delivery: 'a cardboard delivery box with rat ears poking out the top',
  grease: 'a cute grey heron inspector secretly taking gold coins from a hand',
  wok: 'a black wok held up as a shield, clang',
  stink: 'a rat with a smoking stink bomb tucked under it, green stink clouds',
  eartag: 'a rat with a yellow plastic tag clipped to its ear',
  day_stink: 'a cute grey heron inspector holding its nose next to green stink clouds',
  day_pest: 'a pest control van in a night market alley with yellow ear tags',
  day_piper: 'a wooden pipe playing music notes with rats following',
  day_roulette: 'a spinning roulette wheel on a kitchen table',
  day_dayoff: 'a cute grey heron inspector relaxing in sunglasses under a beach umbrella',
  food: 'a steaming bowl of street food noodles with chopsticks',
  kind3: 'three rats in a row',
};
const jobs = [];
for (const [k, s] of Object.entries(SCENES)) jobs.push({ file: k, prompt: `${s}, ${STYLE}`, w: 1200, h: ['food', 'kind3'].includes(k) ? 600 : 720 });
for (const [k, s] of Object.entries(RATS)) for (const b of k === 'sewer' ? ['none'] : ['grill', 'cold', 'pantry'])
  jobs.push({ file: k === 'sewer' ? k : `${k}_${b}`, prompt: k === 'ratato' ? `${s}, ${BREED[b].replace(/ rat\b/, '')} texture, ${STYLE}` : `${RAT}, ${BREED[b]}, ${s}, ${STYLE}`, w: 1200, h: 600 });

const urlFor = j => `https://image.pollinations.ai/prompt/${encodeURIComponent(j.prompt)}?width=${j.w}&height=${j.h}&seed=${SEED}&model=flux&nologo=true`;
module.exports = { jobs, urlFor, SEED };
