/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from '@/lib/db'

interface Q { q: string; a: string[]; c: number; explanation?: string }

const SETS: { title: string; subject: string; gradeLevel: string; description: string; qs: Q[] }[] = [
  {
    title: 'Middle School Math Basics',
    subject: 'Math',
    gradeLevel: 'middle',
    description: 'Fractions, percentages, basic algebra, geometry.',
    qs: [
      { q: 'What is 3/4 + 1/4?', a: ['1', '1/2', '3/4', '4/16'], c: 0, explanation: 'Same denominator, just add numerators: 3+1=4, so 4/4=1.' },
      { q: 'What is 25% of 80?', a: ['15', '20', '25', '40'], c: 1, explanation: '25% = 0.25, and 0.25 × 80 = 20.' },
      { q: 'Solve: x + 7 = 12', a: ['x=3', 'x=5', 'x=7', 'x=19'], c: 1, explanation: 'Subtract 7 from both sides: x = 12 − 7 = 5.' },
      { q: 'How many degrees in a triangle?', a: ['90', '180', '270', '360'], c: 1, explanation: 'Interior angles of any triangle always add to 180°.' },
      { q: 'What is 6 × 7?', a: ['36', '42', '48', '49'], c: 1, explanation: '6 × 7 = 42.' },
      { q: 'Which is the largest?', a: ['0.5', '0.45', '0.505', '0.5001'], c: 2, explanation: '0.505 > 0.5001 > 0.5 = 0.500.' },
      { q: 'What is 144 ÷ 12?', a: ['10', '11', '12', '14'], c: 2, explanation: '12 × 12 = 144, so 144 ÷ 12 = 12.' },
      { q: 'Simplify: 2/6', a: ['1/3', '1/2', '2/3', '3/6'], c: 0, explanation: 'Divide top and bottom by 2: 2/6 = 1/3.' },
    ],
  },
  {
    title: 'High School Biology',
    subject: 'Science',
    gradeLevel: 'high',
    description: 'Cells, genetics, evolution, ecosystems.',
    qs: [
      { q: 'What organelle is the "powerhouse" of the cell?', a: ['Nucleus', 'Mitochondria', 'Ribosome', 'Golgi body'], c: 1, explanation: 'Mitochondria produce ATP via cellular respiration.' },
      { q: 'DNA stands for…', a: ['Deoxyribonucleic acid', 'Dioxyribonuclear acid', 'Deoxyribose nuclear acid', 'Diribonucleic acid'], c: 0, explanation: 'Deoxyribonucleic acid.' },
      { q: 'Which process do plants use to make food?', a: ['Respiration', 'Photosynthesis', 'Digestion', 'Fermentation'], c: 1, explanation: 'Photosynthesis converts sunlight, CO₂, and H₂O into glucose.' },
      { q: 'How many chromosomes do humans have?', a: ['23', '46', '48', '64'], c: 1, explanation: 'Humans have 23 pairs (46 total) chromosomes.' },
      { q: 'Who proposed evolution by natural selection?', a: ['Mendel', 'Darwin', 'Watson', 'Linnaeus'], c: 1, explanation: 'Charles Darwin, in "On the Origin of Species" (1859).' },
      { q: 'What is the basic unit of life?', a: ['Atom', 'Cell', 'Tissue', 'Organ'], c: 1, explanation: 'The cell is the smallest unit of life.' },
      { q: 'Plants make their own food, so they are…', a: ['Heterotrophs', 'Autotrophs', 'Decomposers', 'Parasites'], c: 1, explanation: 'Autotrophs produce their own food using light or chemicals.' },
      { q: 'Which gas do animals breathe in?', a: ['Carbon dioxide', 'Oxygen', 'Nitrogen', 'Hydrogen'], c: 1, explanation: 'Animals inhale oxygen for cellular respiration.' },
    ],
  },
  {
    title: 'Middle School Science Mix',
    subject: 'Science',
    gradeLevel: 'middle',
    description: 'General science for grades 6-8.',
    qs: [
      { q: 'What planet is known as the Red Planet?', a: ['Venus', 'Mars', 'Jupiter', 'Mercury'], c: 1, explanation: 'Mars looks red due to iron oxide (rust) on its surface.' },
      { q: 'What gas do plants absorb from the air?', a: ['Oxygen', 'Carbon dioxide', 'Nitrogen', 'Helium'], c: 1, explanation: 'Plants absorb CO₂ for photosynthesis.' },
      { q: 'What is H₂O commonly known as?', a: ['Salt', 'Sugar', 'Water', 'Hydrogen peroxide'], c: 2, explanation: 'H₂O = two hydrogen atoms + one oxygen atom = water.' },
      { q: 'What force pulls objects toward Earth?', a: ['Magnetism', 'Friction', 'Gravity', 'Tension'], c: 2, explanation: 'Gravity pulls objects toward Earth\'s center.' },
      { q: 'What is the sun?', a: ['A planet', 'A star', 'A moon', 'A comet'], c: 1, explanation: 'The Sun is a medium-sized star at the center of our solar system.' },
      { q: 'What state of matter is steam?', a: ['Solid', 'Liquid', 'Gas', 'Plasma'], c: 2, explanation: 'Steam is water in the gaseous state.' },
      { q: 'What do bees collect from flowers?', a: ['Water', 'Nectar', 'Soil', 'Seeds'], c: 1, explanation: 'Bees collect nectar to make honey.' },
      { q: 'Which is the largest planet in our solar system?', a: ['Earth', 'Saturn', 'Jupiter', 'Neptune'], c: 2, explanation: 'Jupiter is the largest planet — over 1,300 Earths could fit inside.' },
    ],
  },
  {
    title: 'High School World History',
    subject: 'History',
    gradeLevel: 'high',
    description: 'Ancient civilizations through modern era.',
    qs: [
      { q: 'Which ancient civilization built the pyramids of Giza?', a: ['Romans', 'Greeks', 'Egyptians', 'Mayans'], c: 2, explanation: 'The Egyptians built the pyramids as tombs for pharaohs.' },
      { q: 'In what year did World War II end?', a: ['1943', '1945', '1948', '1950'], c: 1, explanation: 'WWII ended in 1945 with the surrender of Japan in September.' },
      { q: 'Who was the first emperor of Rome?', a: ['Julius Caesar', 'Augustus', 'Nero', 'Constantine'], c: 1, explanation: 'Augustus (Octavian) became the first Roman emperor in 27 BCE.' },
      { q: 'The Renaissance began in which country?', a: ['France', 'Italy', 'Germany', 'Spain'], c: 1, explanation: 'The Renaissance started in Italian city-states like Florence in the 14th century.' },
      { q: 'Which document established the U.S. government structure?', a: ['Declaration of Independence', 'Constitution', 'Magna Carta', 'Bill of Rights'], c: 1, explanation: 'The U.S. Constitution (1787) defines the structure of government.' },
      { q: 'Who wrote "The Communist Manifesto"?', a: ['Lenin', 'Stalin', 'Marx and Engels', 'Trotsky'], c: 2, explanation: 'Karl Marx and Friedrich Engels wrote it in 1848.' },
      { q: 'The Industrial Revolution began in…', a: ['France', 'Britain', 'USA', 'Germany'], c: 1, explanation: 'It began in Britain in the late 18th century.' },
      { q: 'What ancient civilization developed democracy?', a: ['Rome', 'Greece', 'Egypt', 'Persia'], c: 1, explanation: 'Athens (ancient Greece) is credited as the birthplace of democracy.' },
    ],
  },
  {
    title: 'Vocabulary Builder — All Grades',
    subject: 'English',
    gradeLevel: 'all',
    description: 'Synonyms, antonyms, and word meanings.',
    qs: [
      { q: 'What does "abundant" mean?', a: ['Rare', 'Plentiful', 'Hidden', 'Tiny'], c: 1, explanation: 'Abundant = existing in large quantities.' },
      { q: 'Synonym for "happy"?', a: ['Sad', 'Joyful', 'Tired', 'Angry'], c: 1, explanation: 'Joyful is a synonym of happy.' },
      { q: 'Antonym for "ancient"?', a: ['Old', 'Modern', 'Historic', 'Antique'], c: 1, explanation: 'Ancient ↔ modern are opposites.' },
      { q: 'What does "benevolent" mean?', a: ['Cruel', 'Kind', 'Lazy', 'Greedy'], c: 1, explanation: 'Benevolent = kind and generous.' },
      { q: 'Synonym for "fast"?', a: ['Slow', 'Quick', 'Heavy', 'Loud'], c: 1, explanation: 'Quick = fast.' },
      { q: 'What does "courage" mean?', a: ['Fear', 'Bravery', 'Doubt', 'Anger'], c: 1, explanation: 'Courage = bravery in the face of fear.' },
      { q: 'Antonym for "generous"?', a: ['Giving', 'Stingy', 'Friendly', 'Honest'], c: 1, explanation: 'Generous ↔ stingy.' },
      { q: 'What does "transparent" mean?', a: ['Opaque', 'See-through', 'Heavy', 'Bright'], c: 1, explanation: 'Transparent = allowing light to pass through so objects behind can be seen.' },
    ],
  },
  {
    title: 'Elementary Math Starter',
    subject: 'Math',
    gradeLevel: 'middle',
    description: 'Foundational arithmetic for review or younger students.',
    qs: [
      { q: 'How many wheels do 2 cars have?', a: ['6', '8', '10', '4'], c: 1, explanation: 'Each car has 4 wheels, so 2 cars have 8.' },
      { q: 'What is 10 + 10?', a: ['20', '100', '11', '2'], c: 0, explanation: '10 + 10 = 20.' },
      { q: 'How many sides does a triangle have?', a: ['4', '2', '3', '5'], c: 2, explanation: 'A triangle has 3 sides.' },
      { q: 'What is 5 × 3?', a: ['8', '15', '25', '12'], c: 1, explanation: '5 × 3 = 15.' },
      { q: 'What is 20 − 7?', a: ['12', '13', '14', '27'], c: 1, explanation: '20 − 7 = 13.' },
      { q: 'Which number is even?', a: ['7', '11', '14', '3'], c: 2, explanation: '14 ÷ 2 = 7 (no remainder), so it is even.' },
      { q: 'What is 100 ÷ 4?', a: ['20', '25', '40', '50'], c: 1, explanation: '100 ÷ 4 = 25.' },
      { q: 'How many minutes in an hour?', a: ['30', '60', '100', '24'], c: 1, explanation: '1 hour = 60 minutes.' },
    ],
  },
]

async function main() {
  console.log('Seeding question sets...')
  for (const s of SETS) {
    const created = await db.questionSet.create({
      data: {
        title: s.title,
        subject: s.subject,
        gradeLevel: s.gradeLevel,
        description: s.description,
        isPublic: true,
        questions: {
          create: s.qs.map((q, i) => ({
            text: q.q,
            choices: JSON.stringify(q.a),
            correctIdx: q.c,
            explanation: q.explanation ?? '',
            order: i,
          })),
        },
      },
    })
    console.log(`  ✓ ${created.title} — ${s.qs.length} questions`)
  }
  console.log('Seed complete.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(async () => { await db.$disconnect() })
