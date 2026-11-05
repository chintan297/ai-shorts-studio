const headlines: string[] = [
  "1 Lakh Beats Daily", // 1 d001-v1
  "3 Hearts!", // 2 d001-v2
  "Wettest Place On Earth", // 3 d002-v1
  "8 Min 20 Sec!", // 4 d002-v2
  "Just 3 Threads!", // 5 d003-v1
  "Sun Mein Mili Gas!", // 6 d003-v2
  "Waves That Glow Blue", // 7 d004-v1
  "Which Line Is Longer?", // 8 d004-v2
  "Idea From A Burr!", // 9 d005-v1
  "Everest Would Sink!", // 10 d005-v2
  "1600 Years, No Rust!", // 11 d006-v1
  "Smallest Bone: 3 mm", // 12 d006-v2
  "Only In India!", // 13 d007-v1
  "3rd Highest Peak!", // 14 d007-v2
  "Why Does Ice Float?", // 15 d008-v1
  "Billions In A Spoon!", // 16 d008-v2
  "Forgotten For Centuries", // 17 d009-v1
  "Oxygen Glows Green!", // 18 d009-v2
  "Name In The Noise!", // 19 d010-v1
  "27m Tall Sundial!", // 20 d010-v2
  "13 Lakh Earths!", // 21 d011-v1
  "Extinct? No, Alive!", // 22 d011-v2
  "Biggest Organ? Skin!", // 23 d012-v1
  "Just 7 Neck Bones!", // 24 d012-v2
  "Lowest Land On Earth", // 25 d013-v1
  "Boils At 120 Degrees", // 26 d013-v2
  "World’s Biggest Flower", // 27 d014-v1
  "Farmers Found This!", // 28 d014-v2
  "Mitti Ki Khushboo!", // 29 d015-v1
  "Study Smarter, Not Longer", // 30 d015-v2
  "Sheep, Duck, Rooster!", // 31 d016-v1
  "Bigger Than All Land", // 32 d016-v2
  "Moon Pe Paani!", // 33 d017-v1
  "Room For Your Heart", // 34 d017-v2
  "Runs On Seawater!", // 35 d018-v1
  "Biggest Mangrove Forest", // 36 d018-v2
  "One Spin, 243 Days!", // 37 d019-v1
  "Champi Se Shampoo!", // 38 d019-v2
  "4500 Year Old Drains!", // 39 d020-v1
  "Layers Like An Onion", // 40 d020-v2
  "Hollow Or Raised?", // 41 d021-v1
  "A Wooden Stethoscope!", // 42 d021-v2
  "Eye Twice As Wide!", // 43 d022-v1
  "Older Than Stonehenge", // 44 d022-v2
  "Twins, Different Prints", // 45 d023-v1
  "Pink Comes From Food", // 46 d023-v2
  "One Country, 11 Zones", // 47 d024-v1
  "4x Faster In Water", // 48 d024-v2
  "Not 24 Hours!", // 49 d025-v1
  "Penicillin: Lucky Mistake", // 50 d025-v2
  "Not Really Water!", // 51 d026-v1
  "Did You Yawn Too?", // 52 d026-v2
  "Bridges That Grow!", // 53 d027-v1
  "Hotter Than Sun’s Surface", // 54 d027-v2
  "Survived Open Space!", // 55 d028-v1
  "120 Days, Then New!", // 56 d028-v2
  "300+ kmph Dive!", // 57 d029-v1
  "Older Than Himalayas!", // 58 d029-v2
  "Steam Makes It Pop!", // 59 d030-v1
  "Nut Outside The Fruit!", // 60 d030-v2
  "Stone Chariot, 24 Wheels", // 61 d031-v1
  "India’s Only Active Volcano", // 62 d031-v2
  "Your Hidden Blind Spot", // 63 d032-v1
  "Wooden Mouse, 1964!", // 64 d032-v2
  "Wider Than The Moon!", // 65 d033-v1
  "Sea Fossils On Everest", // 66 d033-v2
  "Taller In Space!", // 67 d034-v1
  "Fat, Not Water!", // 68 d034-v2
  "979m Tall Waterfall", // 69 d035-v1
  "1670 kmph Spin!", // 70 d035-v2
  "Lightning Makes Glass!", // 71 d036-v1
  "17000 Year Old Art!", // 72 d036-v2
  "Ring Around The Sun", // 73 d037-v1
  "Test Beats Re-Reading", // 74 d037-v2
  "Gas-Lit Traffic Light", // 75 d038-v1
  "Taller Than Qutub Minar", // 76 d038-v2
  "Birds Are Dinosaurs!", // 77 d039-v1
  "Harder Than Bone!", // 78 d039-v2
  "Half Brain Sleeps!", // 79 d040-v1
  "Meteorite Made This Lake", // 80 d040-v2
  "No Sound In Space!", // 81 d041-v1
  "91cm In A Day!", // 82 d041-v2
  "India’s Chess Ancestor", // 83 d042-v1
  "Moon Pulls The Ocean", // 84 d042-v2
  "See A Face Here?", // 85 d043-v1
  "Wootz Steel From India", // 86 d043-v2
  "Sharks Before Trees!", // 87 d044-v1
  "When Sahara Was Green", // 88 d044-v2
  "What Makes A Hiccup?", // 89 d045-v1
  "Up To 18 Feet!", // 90 d045-v2
  "No Bay Is Bigger!", // 91 d046-v1
  "One Cell, 2m DNA!", // 92 d046-v2
  "Light Through Gold!", // 93 d047-v1
  "Preserved In Ash!", // 94 d047-v2
  "Why Glaciers Look Blue", // 95 d048-v1
  "Big Moon? Illusion!", // 96 d048-v2
  "Born As Wallpaper!", // 97 d049-v1
  "Beats 5 Great Lakes", // 98 d049-v2
  "Life Without Sunlight", // 99 d050-v1
  "Up To 60% Water", // 100 d050-v2
  "It Regrows Legs!", // 101 d051-v1
  "World’s Largest Island", // 102 d051-v2
  "Yellow Was Always There", // 103 d052-v1
  "Mirchi Is Videshi!", // 104 d052-v2
  "Stepwell Lost In Silt", // 105 d053-v1
  "3 Seconds Per km", // 106 d053-v2
  "Forgot The Middle?", // 107 d054-v1
  "Train With A Beak!", // 108 d054-v2
  "7.5 Earth Laps!", // 109 d055-v1
  "Stone Age Dentistry!", // 110 d055-v2
  "Gets Oxygen From Air!", // 111 d056-v1
  "Bees Dance Directions", // 112 d056-v2
  "Where 3 Seas Meet", // 113 d057-v1
  "The Only Liquid Metal", // 114 d057-v2
  "Solid Straight To Gas", // 115 d058-v1
  "X-Rays By Accident!", // 116 d058-v2
  "Why Always 6 Sides?", // 117 d059-v1
  "Rocks Moving Up?", // 118 d059-v2
  "Ancient Vending Machine", // 119 d060-v1
  "Not Sahara, Antarctica!", // 120 d060-v2
  "Himalayas Still Rising!", // 121 d061-v1
  "Tiny Muscles Do This!", // 122 d061-v2
  "Thousands Of Turtles!", // 123 d062-v1
  "20% Of River Water!", // 124 d062-v2
  "Steel That Floats!", // 125 d063-v1
  "It Counts To Two!", // 126 d063-v2
  "800 Years Of Learning", // 127 d064-v1
  "Why Is Sky Blue?", // 128 d064-v2
  "Sleep Locks In Memory", // 129 d065-v1
  "AC Was For Printing!", // 130 d065-v2
  "Deepest Hole: 12 km", // 131 d066-v1
  "Closer To Animals!", // 132 d066-v2
  "Nerves Hit 400 kmph", // 133 d067-v1
  "Mammal Lays Eggs!", // 134 d067-v2
  "A Floating National Park", // 135 d068-v1
  "Both Pure Carbon!", // 136 d068-v2
  "3 mm Of Ozone!", // 137 d069-v1
  "Harappan Water Tanks", // 138 d069-v2
  "Spins Anticlockwise!", // 139 d070-v1
  "Saw The Gorilla?", // 140 d070-v2
  "2000 Years, Still Working", // 141 d071-v1
  "Hotter Than Mercury!", // 142 d071-v2
  "Moon Is Drifting Away", // 143 d072-v1
  "Your Liver Regrows!", // 144 d072-v2
  "600+ Volt Fish!", // 145 d073-v1
  "Named After India!", // 146 d073-v2
  "Salt Makes It Conduct", // 147 d074-v1
  "Peanuts Grow Underground", // 148 d074-v2
  "Carved From One Rock", // 149 d075-v1
  "Rainbows Are Full Circles", // 150 d075-v2
  "Seen It? Like It!", // 151 d076-v1
  "A Webcam For Coffee", // 152 d076-v2
  "All Water, One Ball", // 153 d077-v1
  "Earth’s Hidden Core", // 154 d077-v2
  "Tongue Map? Myth!", // 155 d078-v1
  "They Taste With Feet!", // 156 d078-v2
  "From Marsh To Salt", // 157 d079-v1
  "Heat Erases Magnetism", // 158 d079-v2
  "150m+ Salt Layer!", // 159 d080-v1
  "Walls Without Mortar", // 160 d080-v2
  "Monsoon Means Season", // 161 d081-v1
  "24 Frames A Second", // 162 d081-v2
  "No Pedals At All!", // 163 d082-v1
  "Longest Range: Undersea", // 164 d082-v2
  "2000 Year Old Gears!", // 165 d083-v1
  "Adults Have 206 Bones", // 166 d083-v2
  "Only Flying Mammal!", // 167 d084-v1
  "Islands Made Of Coral", // 168 d084-v2
  "Half Our Oxygen? Ocean!", // 169 d085-v1
  "4800+ Year Old Tree!", // 170 d085-v2
  "Granite Temple, 1010 CE", // 171 d086-v1
  "Green Flash Is Real!", // 172 d086-v2
  "Multitasking Slows You", // 173 d087-v1
  "Oops, Non-Stick!", // 174 d087-v2
  "Moving At Nail Speed", // 175 d088-v1
  "1-2% Neanderthal DNA", // 176 d088-v2
  "10 Lakh Tiny Filters", // 177 d089-v1
  "Biggest Animal Ever!", // 178 d089-v2
  "India’s Largest Lagoon", // 179 d090-v1
  "Rainbow Inside Sunlight", // 180 d090-v2
];

export default headlines;
