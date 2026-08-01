import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function POST() {
  try {
    // Create sample users
    const teacher = await db.user.upsert({
      where: { email: "teacher@school.edu" },
      update: {},
      create: { name: "Ms. Johnson", email: "teacher@school.edu", role: "teacher", coins: 5000 },
    })

    const student1 = await db.user.upsert({
      where: { email: "alex@student.edu" },
      update: {},
      create: { name: "Alex", email: "alex@student.edu", role: "student", coins: 1250, streak: 5 },
    })

    const student2 = await db.user.upsert({
      where: { email: "sam@student.edu" },
      update: {},
      create: { name: "Sam", email: "sam@student.edu", role: "student", coins: 890, streak: 3 },
    })

    const student3 = await db.user.upsert({
      where: { email: "jordan@student.edu" },
      update: {},
      create: { name: "Jordan", email: "jordan@student.edu", role: "student", coins: 2100, streak: 12 },
    })

    // Create sample question sets
    const mathSet = await db.questionSet.create({
      data: {
        title: "Algebra Basics",
        subject: "Math",
        gradeLevel: "8th",
        description: "Linear equations, slope, and basic algebra concepts",
        isPublic: true,
        creatorId: teacher.id,
        questions: {
          create: [
            { text: "What is the slope of y = 2x + 3?", choices: '["2","3","5","6"]', correctIdx: 0, explanation: "The slope is the coefficient of x", order: 0 },
            { text: "Solve for x: 3x = 15", choices: '["3","5","15","45"]', correctIdx: 1, explanation: "Divide both sides by 3", order: 1 },
            { text: "What is the y-intercept of y = -x + 7?", choices: '["-1","7","1","-7"]', correctIdx: 1, explanation: "The y-intercept is the constant term", order: 2 },
            { text: "Simplify: 2(x + 4)", choices: '["2x + 4","2x + 8","x + 8","2x + 6"]', correctIdx: 1, explanation: "Distribute the 2 to both terms", order: 3 },
            { text: "If f(x) = 3x - 1, what is f(2)?", choices: '["5","6","7","4"]', correctIdx: 0, explanation: "Substitute x=2: 3(2)-1 = 5", order: 4 },
          ],
        },
      },
      include: { questions: true },
    })

    const scienceSet = await db.questionSet.create({
      data: {
        title: "Cell Biology",
        subject: "Science",
        gradeLevel: "7th",
        description: "Cell structure, organelles, and cellular processes",
        isPublic: true,
        creatorId: teacher.id,
        questions: {
          create: [
            { text: "What is the powerhouse of the cell?", choices: '["Nucleus","Mitochondria","Ribosome","Golgi body"]', correctIdx: 1, order: 0 },
            { text: "Which organelle stores genetic material?", choices: '["Ribosome","Mitochondria","Nucleus","Vacuole"]', correctIdx: 2, order: 1 },
            { text: "What is the cell membrane made of?", choices: '["Protein only","Carbohydrates","Phospholipid bilayer","DNA"]', correctIdx: 2, order: 2 },
            { text: "Photosynthesis occurs in which organelle?", choices: '["Mitochondria","Chloroplast","Ribosome","Nucleus"]', correctIdx: 1, order: 3 },
            { text: "What process do cells use to divide?", choices: '["Osmosis","Mitosis","Diffusion","Respiration"]', correctIdx: 1, order: 4 },
          ],
        },
      },
      include: { questions: true },
    })

    const historySet = await db.questionSet.create({
      data: {
        title: "American Revolution",
        subject: "History",
        gradeLevel: "8th",
        description: "Key events and figures of the American Revolution",
        isPublic: true,
        creatorId: teacher.id,
        questions: {
          create: [
            { text: "When was the Declaration of Independence signed?", choices: '["1774","1776","1783","1789"]', correctIdx: 1, order: 0 },
            { text: "Who was the commander of the Continental Army?", choices: '["Thomas Jefferson","Benjamin Franklin","George Washington","John Adams"]', correctIdx: 2, order: 1 },
            { text: "What was the first battle of the Revolution?", choices: '["Yorktown","Saratoga","Lexington & Concord","Bunker Hill"]', correctIdx: 2, order: 2 },
            { text: "Which country was America's main ally?", choices: '["Spain","France","Germany","Netherlands"]', correctIdx: 1, order: 3 },
            { text: "What was the final major battle of the war?", choices: '["Lexington","Bunker Hill","Saratoga","Yorktown"]', correctIdx: 3, order: 4 },
          ],
        },
      },
      include: { questions: true },
    })

    const englishSet = await db.questionSet.create({
      data: {
        title: "Literary Devices",
        subject: "English",
        gradeLevel: "9th",
        description: "Metaphor, simile, personification, and more",
        isPublic: true,
        creatorId: teacher.id,
        questions: {
          create: [
            { text: '"The wind whispered through the trees" is an example of:', choices: '["Simile","Metaphor","Personification","Alliteration"]', correctIdx: 2, order: 0 },
            { text: '"Life is a highway" is an example of:', choices: '["Simile","Metaphor","Onomatopoeia","Hyperbole"]', correctIdx: 1, order: 1 },
            { text: '"She was as brave as a lion" is a:', choices: '["Metaphor","Simile","Personification","Irony"]', correctIdx: 1, order: 2 },
            { text: "Which is an example of alliteration?", choices: '["The sun smiled","Peter Piper picked","A sea of troubles","Boom! Crash!"]', correctIdx: 1, order: 3 },
            { text: '"I have a million things to do" is an example of:', choices: '["Litotes","Hyperbole","Simile","Metaphor"]', correctIdx: 1, order: 4 },
          ],
        },
      },
      include: { questions: true },
    })

    const geoSet = await db.questionSet.create({
      data: {
        title: "World Geography",
        subject: "Geography",
        gradeLevel: "7th",
        description: "Continents, oceans, and major landforms",
        isPublic: true,
        creatorId: teacher.id,
        questions: {
          create: [
            { text: "What is the largest continent?", choices: '["Africa","North America","Asia","Europe"]', correctIdx: 2, order: 0 },
            { text: "Which ocean is the smallest?", choices: '["Atlantic","Indian","Pacific","Arctic"]', correctIdx: 3, order: 1 },
            { text: "What is the longest river in the world?", choices: '["Amazon","Nile","Mississippi","Yangtze"]', correctIdx: 1, order: 2 },
            { text: "Mount Everest is located on the border of:", choices: '["India & China","Nepal & China","Nepal & India","Pakistan & China"]', correctIdx: 1, order: 3 },
            { text: "Which desert is the largest hot desert?", choices: '["Gobi","Kalahari","Sahara","Arabian"]', correctIdx: 2, order: 4 },
          ],
        },
      },
      include: { questions: true },
    })

    // Create achievements
    const achievements = await Promise.all([
      db.achievement.upsert({ where: { key: "first_game" }, update: {}, create: { key: "first_game", name: "First Lap", description: "Complete your first game", icon: "🏁", category: "gameplay", requirement: 1 } }),
      db.achievement.upsert({ where: { key: "perfect_score" }, update: {}, create: { key: "perfect_score", name: "Flawless Run", description: "Get a perfect score on a quiz", icon: "💯", category: "gameplay", requirement: 1 } }),
      db.achievement.upsert({ where: { key: "streak_5" }, update: {}, create: { key: "streak_5", name: "On Fire", description: "Get a 5-question streak", icon: "🔥", category: "gameplay", requirement: 5 } }),
      db.achievement.upsert({ where: { key: "streak_10" }, update: {}, create: { key: "streak_10", name: "Unstoppable", description: "Get a 10-question streak", icon: "⚡", category: "gameplay", requirement: 10 } }),
      db.achievement.upsert({ where: { key: "coins_1000" }, update: {}, create: { key: "coins_1000", name: "Coin Collector", description: "Earn 1,000 coins total", icon: "🪙", category: "collection", requirement: 1000 } }),
      db.achievement.upsert({ where: { key: "coins_5000" }, update: {}, create: { key: "coins_5000", name: "Treasure Hunter", description: "Earn 5,000 coins total", icon: "💎", category: "collection", requirement: 5000 } }),
      db.achievement.upsert({ where: { key: "games_10" }, update: {}, create: { key: "games_10", name: "Regular Racer", description: "Play 10 games", icon: "🏎️", category: "gameplay", requirement: 10 } }),
      db.achievement.upsert({ where: { key: "games_50" }, update: {}, create: { key: "games_50", name: "Road Warrior", description: "Play 50 games", icon: "🛣️", category: "gameplay", requirement: 50 } }),
      db.achievement.upsert({ where: { key: "login_streak_7" }, update: {}, create: { key: "login_streak_7", name: "Dedicated Learner", description: "Log in 7 days in a row", icon: "📅", category: "streak", requirement: 7 } }),
      db.achievement.upsert({ where: { key: "friends_5" }, update: {}, create: { key: "friends_5", name: "Social Butterfly", description: "Make 5 friends", icon: "🦋", category: "social", requirement: 5 } }),
      db.achievement.upsert({ where: { key: "sets_created" }, update: {}, create: { key: "sets_created", name: "Quiz Master", description: "Create 5 question sets", icon: "📝", category: "gameplay", requirement: 5 } }),
      db.achievement.upsert({ where: { key: "speed_demon" }, update: {}, create: { key: "speed_demon", name: "Speed Demon", description: "Answer a question in under 3 seconds", icon: "💨", category: "gameplay", requirement: 1 } }),
    ])

    // Create shop items
    const shopItems = await Promise.all([
      db.shopItem.upsert({ where: { key: "skin_blue" }, update: {}, create: { key: "skin_blue", name: "Ocean Blue", description: "A cool blue car paint job", category: "car_skin", price: 200, icon: "🔵", rarity: "common" } }),
      db.shopItem.upsert({ where: { key: "skin_red" }, update: {}, create: { key: "skin_red", name: "Racing Red", description: "Classic racing red paint", category: "car_skin", price: 200, icon: "🔴", rarity: "common" } }),
      db.shopItem.upsert({ where: { key: "skin_gold" }, update: {}, create: { key: "skin_gold", name: "Gold Rush", description: "Shiny gold paint that screams winner", category: "car_skin", price: 500, icon: "🟡", rarity: "rare" } }),
      db.shopItem.upsert({ where: { key: "skin_neon" }, update: {}, create: { key: "skin_neon", name: "Neon Glow", description: "Glowing neon paint that lights up the track", category: "car_skin", price: 800, icon: "💜", rarity: "epic" } }),
      db.shopItem.upsert({ where: { key: "skin_rainbow" }, update: {}, create: { key: "skin_rainbow", name: "Rainbow Rider", description: "A mesmerizing rainbow paint effect", category: "car_skin", price: 1500, icon: "🌈", rarity: "legendary" } }),
      db.shopItem.upsert({ where: { key: "powerup_shield" }, update: {}, create: { key: "powerup_shield", name: "Shield", description: "Blocks one wrong answer penalty", category: "power_up", price: 100, icon: "🛡️", rarity: "common" } }),
      db.shopItem.upsert({ where: { key: "powerup_double" }, update: {}, create: { key: "powerup_double", name: "Double Points", description: "Double points on your next correct answer", category: "power_up", price: 150, icon: "✖️", rarity: "common" } }),
      db.shopItem.upsert({ where: { key: "powerup_skip" }, update: {}, create: { key: "powerup_skip", name: "Skip Question", description: "Skip a tough question without penalty", category: "power_up", price: 200, icon: "⏭️", rarity: "rare" } }),
      db.shopItem.upsert({ where: { key: "powerup_freeze" }, update: {}, create: { key: "powerup_freeze", name: "Time Freeze", description: "Freeze the question timer for 10 seconds", category: "power_up", price: 250, icon: "❄️", rarity: "rare" } }),
      db.shopItem.upsert({ where: { key: "trail_fire" }, update: {}, create: { key: "trail_fire", name: "Fire Trail", description: "Leave a trail of flames behind your car", category: "trail", price: 300, icon: "🔥", rarity: "rare" } }),
      db.shopItem.upsert({ where: { key: "trail_stars" }, update: {}, create: { key: "trail_stars", name: "Star Trail", description: "Twinkling stars follow your every move", category: "trail", price: 400, icon: "⭐", rarity: "epic" } }),
      db.shopItem.upsert({ where: { key: "badge_champion" }, update: {}, create: { key: "badge_champion", name: "Champion Badge", description: "Show everyone you're a champion", category: "badge", price: 1000, icon: "🏆", rarity: "legendary" } }),
    ])

    // Create sample game results for students
    await db.gameResult.createMany({
      data: [
        { userId: student1.id, gameType: "solo", setId: mathSet.id, score: 850, correct: 4, wrong: 1, bestStreak: 3, coinsEarned: 120, duration: 180 },
        { userId: student1.id, gameType: "solo", setId: scienceSet.id, score: 1100, correct: 5, wrong: 0, bestStreak: 5, coinsEarned: 200, duration: 165 },
        { userId: student1.id, gameType: "live", setId: mathSet.id, score: 620, correct: 3, wrong: 2, bestStreak: 2, coinsEarned: 80, duration: 200 },
        { userId: student2.id, gameType: "solo", setId: historySet.id, score: 720, correct: 3, wrong: 2, bestStreak: 2, coinsEarned: 90, duration: 210 },
        { userId: student2.id, gameType: "live", setId: scienceSet.id, score: 950, correct: 4, wrong: 1, bestStreak: 3, coinsEarned: 150, duration: 190 },
        { userId: student3.id, gameType: "solo", setId: englishSet.id, score: 1400, correct: 5, wrong: 0, bestStreak: 5, coinsEarned: 250, duration: 150 },
        { userId: student3.id, gameType: "solo", setId: geoSet.id, score: 980, correct: 4, wrong: 1, bestStreak: 4, coinsEarned: 160, duration: 175 },
        { userId: student3.id, gameType: "live", setId: mathSet.id, score: 1200, correct: 5, wrong: 0, bestStreak: 5, coinsEarned: 220, duration: 160 },
      ],
    })

    // Give some achievements to students (use upsert to handle duplicates with SQLite)
    const achievementData = [
      { userId: student1.id, achievementId: achievements[0].id },
      { userId: student1.id, achievementId: achievements[2].id },
      { userId: student2.id, achievementId: achievements[0].id },
      { userId: student3.id, achievementId: achievements[0].id },
      { userId: student3.id, achievementId: achievements[1].id },
      { userId: student3.id, achievementId: achievements[2].id },
      { userId: student3.id, achievementId: achievements[4].id },
    ]
    for (const a of achievementData) {
      await db.userAchievement.upsert({
        where: { userId_achievementId: { userId: a.userId, achievementId: a.achievementId } },
        update: {},
        create: a,
      }).catch(() => {})
    }

    // Give some items to students (use upsert to handle duplicates with SQLite)
    const itemData = [
      { userId: student1.id, itemId: shopItems[0].id },
      { userId: student3.id, itemId: shopItems[2].id, equipped: true },
      { userId: student3.id, itemId: shopItems[5].id },
    ]
    for (const i of itemData) {
      await db.userItem.upsert({
        where: { userId_itemId: { userId: i.userId, itemId: i.itemId } },
        update: {},
        create: i,
      }).catch(() => {})
    }

    // Create a sample homework assignment
    await db.homework.create({
      data: {
        setId: mathSet.id,
        teacherId: teacher.id,
        title: "Algebra Review - Chapter 3",
        description: "Complete the algebra review before Friday's test",
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        mode: "heart",
      },
    })

    return NextResponse.json({ 
      success: true, 
      message: "Database seeded with sample data",
      users: { teacher: teacher.id, students: [student1.id, student2.id, student3.id] },
      sets: { math: mathSet.id, science: scienceSet.id, history: historySet.id, english: englishSet.id, geography: geoSet.id },
    })
  } catch (error) {
    console.error("Seed error:", error)
    return NextResponse.json({ error: "Failed to seed database", details: String(error) }, { status: 500 })
  }
}
