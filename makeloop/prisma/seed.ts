import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const skills = [
  { slug: "structures", name: "Structures", emoji: "🏗️" },
  { slug: "forces", name: "Forces", emoji: "🧲" },
  { slug: "balance", name: "Balance", emoji: "⚖️" },
  { slug: "motion", name: "Motion", emoji: "🚗" },
  { slug: "design", name: "Design Thinking", emoji: "💡" },
  { slug: "testing", name: "Testing & Improving", emoji: "🔁" },
];

const materials: Record<string, string> = {
  "Paper sheets": "📄",
  "Sticky tape": "🩹",
  Books: "📚",
  Coins: "🪙",
  "Drinking straws": "🥤",
  "Paper cups": "🥛",
  "Cardboard": "📦",
  "Bottle caps": "🔘",
  "Wooden skewers (blunt ends)": "🥢",
  "Plastic bag": "🛍️",
  String: "🧵",
  "Small toy": "🧸",
  "Aluminium foil": "🥈",
  "Tub of water": "🛁",
  "Craft sticks": "🪵",
  "Rubber bands": "➰",
  "Plastic spoon": "🥄",
  "Pom-poms": "🧶",
};

type SeedMission = {
  slug: string;
  title: string;
  emoji: string;
  summary: string;
  objective: string;
  expectedObject: string;
  requirements: string[];
  concept: string;
  explanation: string;
  hints: [string, string, string];
  safetyNotes?: string;
  minAge: number;
  maxAge: number;
  difficulty: number;
  materials: [string, string][];
  skills: string[];
};

const missions: SeedMission[] = [
  {
    slug: "paper-bridge",
    title: "Paper Bridge Challenge",
    emoji: "🌉",
    summary: "Can a few sheets of paper hold up a pile of coins?",
    objective: "Build a bridge out of paper that spans the gap between two books and holds as many coins as possible.",
    expectedObject: "paper bridge between two supports",
    requirements: [
      "The bridge spans the gap between two supports",
      "The paper is folded, rolled, or shaped instead of lying flat",
      "Coins or another weight are resting on the bridge to test it",
    ],
    concept: "Shape makes materials stronger",
    explanation:
      "A flat sheet of paper bends easily, but when you fold or roll it, it gets much stiffer. Folds and tubes spread the weight out so no single spot has to hold it all. That's why real bridges use shapes like arches, triangles, and beams!",
    hints: [
      "What happens to a flat sheet of paper when you put one coin on it? How could you change the paper's shape?",
      "Folding paper into zig-zags or rolling it into tubes makes it stiffer, because the weight gets spread across many folds instead of one flat sheet.",
      "Try folding your paper back and forth like a fan, lay it across the gap, and add coins one at a time.",
    ],
    minAge: 5,
    maxAge: 12,
    difficulty: 1,
    materials: [
      ["Paper sheets", "3–5 sheets"],
      ["Sticky tape", "a little"],
      ["Books", "2 of the same height"],
      ["Coins", "a handful"],
    ],
    skills: ["structures", "forces", "testing"],
  },
  {
    slug: "tall-tower",
    title: "Tallest Tower",
    emoji: "🗼",
    summary: "Build a tower that stands tall all by itself.",
    objective: "Use straws and tape to build the tallest tower you can that stands up on its own for 10 seconds.",
    expectedObject: "free-standing tower made of straws",
    requirements: [
      "The tower stands up on its own without anyone holding it",
      "The tower is much taller than it is wide",
      "The bottom of the tower is wider or more braced than the top",
    ],
    concept: "A wide base keeps things stable",
    explanation:
      "Tall things tip over when their weight leans past the edge of their base. A wide, strong bottom and a light top keep the weight in the middle. Triangles in the frame stop it from wobbling, just like on real towers and cranes!",
    hints: [
      "When your tower wobbles, where does it start to lean? What is the bottom of your tower like?",
      "Towers are steadiest when the base is wide and the top is light. Triangles make frames stiff so they don't sway.",
      "Make a wide triangle or square base first, add diagonal straws to form triangles, and keep the top part short and light.",
    ],
    minAge: 5,
    maxAge: 12,
    difficulty: 1,
    materials: [
      ["Drinking straws", "about 20"],
      ["Sticky tape", "one roll"],
      ["Paper cups", "optional, for a base"],
    ],
    skills: ["structures", "balance", "design"],
  },
  {
    slug: "foil-boat",
    title: "Foil Boat Cargo",
    emoji: "⛵",
    summary: "Make a boat that floats while carrying coins.",
    objective: "Shape a sheet of foil into a boat that floats in water and carries as many coins as you can.",
    expectedObject: "aluminium foil boat floating in water",
    requirements: [
      "The boat has raised sides all the way around",
      "The boat is floating on water",
      "Coins or small objects are inside the boat",
    ],
    concept: "Buoyancy: pushing water aside helps things float",
    explanation:
      "A boat floats because it pushes water out of the way, and the water pushes back up. A wide boat with tall sides pushes aside lots of water, so it can carry more. Spreading the coins out keeps it from tipping!",
    hints: [
      "Where does the water get in when your boat sinks? Where are you putting the coins?",
      "A boat floats when it pushes lots of water aside. Wider boats with taller sides can push aside more water, and spreading the load keeps them level.",
      "Make a flat, wide bottom with sides about as tall as your finger, then place coins evenly across the bottom, not in one pile.",
    ],
    safetyNotes: "Use a sink or tub with a grown-up nearby, and wipe up spills so no one slips.",
    minAge: 5,
    maxAge: 12,
    difficulty: 2,
    materials: [
      ["Aluminium foil", "1 sheet, about 30 cm"],
      ["Tub of water", "a sink or bowl"],
      ["Coins", "a handful"],
    ],
    skills: ["forces", "design", "testing"],
  },
  {
    slug: "parachute",
    title: "Toy Parachute",
    emoji: "🪂",
    summary: "Help a toy float gently to the ground.",
    objective: "Build a parachute that makes a small toy fall slowly when dropped from standing height.",
    expectedObject: "parachute with strings attached to a small toy",
    requirements: [
      "There is a canopy (the big part that catches air)",
      "Strings connect the canopy to the toy",
      "A small toy or weight is attached at the bottom",
    ],
    concept: "Air resistance slows falling things",
    explanation:
      "As something falls, it has to push air out of the way. A big canopy catches lots of air, which pushes back and slows the fall. That's air resistance — the same thing you feel when you hold your hand out of a car window!",
    hints: [
      "Does your parachute open up when it falls? What happens if you make the canopy bigger or smaller?",
      "A wider canopy catches more air, and more air pushing up means a slower fall. Strings of equal length help it open evenly.",
      "Cut a big square from the bag, tie a string of the same length to each corner, and tie all four strings to your toy.",
    ],
    safetyNotes: "Drop it from standing height on the floor. Keep plastic bags away from faces.",
    minAge: 6,
    maxAge: 12,
    difficulty: 2,
    materials: [
      ["Plastic bag", "1"],
      ["String", "4 pieces, same length"],
      ["Small toy", "1 light toy"],
      ["Sticky tape", "a little"],
    ],
    skills: ["forces", "motion", "testing"],
  },
  {
    slug: "rolling-car",
    title: "Rolling Car",
    emoji: "🚗",
    summary: "Build a car that rolls straight across the floor.",
    objective: "Build a car from cardboard, straws and bottle caps that rolls smoothly down a gentle ramp.",
    expectedObject: "small cardboard car with bottle-cap wheels",
    requirements: [
      "The car has four wheels",
      "The wheels are attached with axles so they can spin",
      "The car has a body or platform on top of the axles",
    ],
    concept: "Wheels and axles reduce friction",
    explanation:
      "Dragging a box is hard because it rubs on the floor. Wheels roll instead of rubbing, so there's much less friction. The axle is the stick the wheel spins around — if it spins freely, the car rolls far!",
    hints: [
      "Do your wheels spin easily when you flick them? What might be stopping them?",
      "Wheels need to spin freely around an axle. If the axle is squeezed too tight or the wheels are crooked, friction slows the car down.",
      "Tape a straw across the bottom of the car, slide a skewer through it, and fix a bottle cap on each end so the skewer spins inside the straw.",
    ],
    safetyNotes: "Ask a grown-up to make holes in bottle caps. Keep skewer ends blunt.",
    minAge: 7,
    maxAge: 12,
    difficulty: 3,
    materials: [
      ["Cardboard", "1 small piece"],
      ["Bottle caps", "4"],
      ["Drinking straws", "2"],
      ["Wooden skewers (blunt ends)", "2"],
      ["Sticky tape", "a little"],
    ],
    skills: ["motion", "design", "structures"],
  },
  {
    slug: "pom-pom-launcher",
    title: "Pom-Pom Launcher",
    emoji: "🎯",
    summary: "Use a lever to launch a soft pom-pom into a cup.",
    objective: "Build a lever launcher from craft sticks and rubber bands that flings a pom-pom into a target cup.",
    expectedObject: "craft-stick lever launcher with a spoon",
    requirements: [
      "There is a lever arm (a stick that can swing up and down)",
      "A pivot point (fulcrum) holds up the lever",
      "A spoon or cup on the lever holds the pom-pom",
    ],
    concept: "Levers turn a small push into a big motion",
    explanation:
      "A lever is a stick that turns around a pivot point called a fulcrum. When you push one end down a little, the other end swings up a lot! Moving the fulcrum changes how high and far things go.",
    hints: [
      "Where is the pivot of your launcher? What happens if you press closer to it or farther away?",
      "A lever swings around its fulcrum. Moving the fulcrum changes the balance between how hard you press and how far the other end moves.",
      "Stack a few craft sticks with rubber bands to make the fulcrum, lay one stick across it, tape the spoon to one end, and press the other end.",
    ],
    safetyNotes: "Launch only soft pom-poms, and never aim at people or pets.",
    minAge: 8,
    maxAge: 14,
    difficulty: 3,
    materials: [
      ["Craft sticks", "about 8"],
      ["Rubber bands", "4–6"],
      ["Plastic spoon", "1"],
      ["Pom-poms", "a few"],
      ["Paper cups", "1 as a target"],
    ],
    skills: ["forces", "motion", "testing"],
  },
];

async function main() {
  for (const s of skills) {
    await prisma.skill.upsert({ where: { slug: s.slug }, create: s, update: s });
  }
  for (const [name, emoji] of Object.entries(materials)) {
    await prisma.material.upsert({ where: { name }, create: { name, emoji }, update: { emoji } });
  }
  const skillIds = new Map((await prisma.skill.findMany()).map((s) => [s.slug, s.id]));
  const materialIds = new Map((await prisma.material.findMany()).map((m) => [m.name, m.id]));

  for (const m of missions) {
    const { materials: mats, skills: sk, ...data } = m;
    const mission = await prisma.mission.upsert({ where: { slug: m.slug }, create: data, update: data });
    await prisma.missionMaterial.deleteMany({ where: { missionId: mission.id } });
    await prisma.missionMaterial.createMany({
      data: mats.map(([name, quantity]) => ({ missionId: mission.id, materialId: materialIds.get(name)!, quantity })),
    });
    await prisma.missionSkill.deleteMany({ where: { missionId: mission.id } });
    await prisma.missionSkill.createMany({
      data: sk.map((slug) => ({ missionId: mission.id, skillId: skillIds.get(slug)! })),
    });
  }

  // Optional stage-demo account; only created when a password is supplied.
  const demoPassword = process.env.SEED_DEMO_PASSWORD;
  if (demoPassword) {
    const parent = await prisma.user.upsert({
      where: { email: "demo@makeloop.app" },
      create: { email: "demo@makeloop.app", name: "Demo Parent", passwordHash: await bcrypt.hash(demoPassword, 12) },
      update: { passwordHash: await bcrypt.hash(demoPassword, 12) },
    });
    const existing = await prisma.childProfile.findFirst({ where: { parentId: parent.id } });
    if (!existing) await prisma.childProfile.create({ data: { parentId: parent.id, name: "Sam", age: 8, avatar: "robot" } });
  }

  console.log(`Seeded ${skills.length} skills, ${Object.keys(materials).length} materials, ${missions.length} missions`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
