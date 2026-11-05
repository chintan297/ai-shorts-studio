const headlines: string[] = [
  "Light Bends Here", // 1 d001-v1
  "Saturn's Ice Rings", // 2 d001-v2
  "Imagine: Twin Suns", // 3 d002-v1
  "You Are Here!", // 4 d002-v2
  "South Pole Par Bharat", // 5 d003-v1
  "Orion's Star Nursery", // 6 d003-v2
  "The 400x Coincidence", // 7 d004-v1
  "13.8 Billion Years", // 8 d004-v2
  "Sun Holds 99.8%", // 9 d005-v1
  "Invisible Matter?", // 10 d005-v2
  "Another Sun's Planet", // 11 d006-v1
  "Point Of No Return", // 12 d006-v2
  "Lead Melts On Venus", // 13 d007-v1
  "Alien Crystal Canyon", // 14 d007-v2
  "Galaxy You Can See", // 15 d008-v1
  "Into Interstellar Space", // 16 d008-v2
  "Where Stars Are Born", // 17 d009-v1
  "What Colors The Aurora?", // 18 d009-v2
  "Space Is Silent", // 19 d010-v1
  "Ocean Under The Ice?", // 20 d010-v2
  "Corona's Heat Mystery", // 21 d011-v1
  "Water On The Moon!", // 22 d011-v2
  "Million-Degree Whirlpool", // 23 d012-v1
  "Nearly 3x Everest!", // 24 d012-v2
  "Imagine: Sky Jellyfish", // 25 d013-v1
  "Hat-Shaped Galaxy", // 26 d013-v2
  "16 Sunrises A Day", // 27 d014-v1
  "30 Spins Per Second", // 28 d014-v2
  "Comet Dust Shower", // 29 d015-v1
  "8-Minute-Old Sunlight", // 30 d015-v2
  "Moon Is Drifting Away", // 31 d016-v1
  "1 Millisecond Mystery", // 32 d016-v2
  "Pluto Has A Heart", // 33 d017-v1
  "Rock Becomes Noodle!", // 34 d017-v2
  "The Sideways Planet", // 35 d018-v1
  "A Sunless Dream World", // 36 d018-v2
  "3 Galaxy Shapes", // 37 d019-v1
  "Pehli Koshish Mein Mars!", // 38 d019-v2
  "A Horse In Space?", // 39 d020-v1
  "Tilt, Not Distance!", // 40 d020-v2
  "We Are Stardust", // 41 d021-v1
  "Icy Worlds Past Neptune", // 42 d021-v2
  "Where's The Antimatter?", // 43 d022-v1
  "Moon With Ice Fountains", // 44 d022-v2
  "4 Million Suns Heavy", // 45 d023-v1
  "Storm Bigger Than Earth", // 46 d023-v2
  "Imagine: Lava Rivers", // 47 d024-v1
  "That Cloud? A Galaxy!", // 48 d024-v2
  "Mars Par Pehli Udaan", // 49 d025-v1
  "Planet? Nope, Nebula!", // 50 d025-v2
  "Brighter Than A Galaxy", // 51 d026-v1
  "Light-Year Is Distance", // 52 d026-v2
  "Hundreds Of Volcanoes", // 53 d027-v1
  "First Interstellar Guest", // 54 d027-v2
  "Farthest Flyby Ever", // 55 d028-v1
  "Sun Squeezed To 6km?", // 56 d028-v2
  "Hot Days, Icy Nights", // 57 d029-v1
  "What If Mountains Floated?", // 58 d029-v2
  "Galaxies Merge, Stars Miss", // 59 d030-v1
  "1969: First Moon Steps", // 60 d030-v2
  "These Aren't Mountains", // 61 d031-v1
  "Moon Lit By Earth", // 62 d031-v2
  "A Billion-Ton Teaspoon", // 63 d032-v1
  "7 Earth-Sized Planets", // 64 d032-v2
  "Where Physics Breaks", // 65 d033-v1
  "First Telescope Planet", // 66 d033-v2
  "Quasar: Cosmic Beacon", // 67 d034-v1
  "2000+ Kmph Winds", // 68 d034-v2
  "Imagine: Life Under Ice", // 69 d035-v1
  "230 Million Year Orbit", // 70 d035-v2
  "India Watches The Sun", // 71 d036-v1
  "A Star Is Born", // 72 d036-v2
  "Jupiter + Saturn Meet", // 73 d037-v1
  "Universe Is Expanding", // 74 d037-v2
  "Asteroids Lighter Than Moon", // 75 d038-v1
  "A Hexagon On Saturn", // 76 d038-v2
  "A Grain Of Galaxies", // 77 d039-v1
  "Gas-Pulling Black Hole", // 78 d039-v2
  "Mars Is Rusty!", // 79 d040-v1
  "Alien Desert Of Glass", // 80 d040-v2
  "Whirlpool & Its Buddy", // 81 d041-v1
  "Webb's Golden Mirror", // 82 d041-v2
  "One Nebula, Two Colors", // 83 d042-v1
  "Cosmic Lighthouse", // 84 d042-v2
  "Three-Quarters Hydrogen", // 85 d043-v1
  "Seas Of Methane", // 86 d043-v2
  "The 68% Mystery", // 87 d044-v1
  "Helium Found In Sunlight", // 88 d044-v2
  "Time Slows Down Here", // 89 d045-v1
  "Our Only Known Home", // 90 d045-v2
  "Galaxy Core Over Ladakh", // 91 d046-v1
  "104 Satellites, 1 Rocket", // 92 d046-v2
  "Giant Eye In Space", // 93 d047-v1
  "Tail Leads The Way?", // 94 d047-v2
  "Old Light From Sirius", // 95 d048-v1
  "15 Million Degrees!", // 96 d048-v2
  "Are We Alone?", // 97 d049-v1
  "Mars' Ancient Lake", // 98 d049-v2
  "A Black Hole Sings", // 99 d050-v1
  "1300+ Earths Fit Inside", // 100 d050-v2
  "Imagine: Purple Forests", // 101 d051-v1
  "Galaxy Like A Wheel", // 102 d051-v2
  "22 Daring Dives", // 103 d052-v1
  "Giant Star Factory", // 104 d052-v2
  "Why Moon Turns Red?", // 105 d053-v1
  "Big Bang Afterglow", // 106 d053-v2
  "Sun's Closest Neighbor", // 107 d054-v1
  "Is Planet Nine Real?", // 108 d054-v2
  "1610: Jupiter's Moons", // 109 d055-v1
  "Star To Black Hole", // 110 d055-v2
  "Sunrise In The West", // 111 d056-v1
  "Endless Alien Lightning", // 112 d056-v2
  "Space Ki Phirki", // 113 d057-v1
  "First Comet Landing", // 114 d057-v2
  "Star-Blown Bubble", // 115 d058-v1
  "When The Sun Erupts", // 116 d058-v2
  "Gold Made In Space", // 117 d059-v1
  "Moon Bigger Than Mercury", // 118 d059-v2
  "Our Galaxy's Bubbles", // 119 d060-v1
  "Chand Par Sulfur Mila!", // 120 d060-v2
  "Near Light-Speed Jet", // 121 d061-v1
  "Would Saturn Float?", // 122 d061-v2
  "Imagine: Eyeball Planet", // 123 d062-v1
  "Galaxies In A Dance", // 124 d062-v2
  "Hubble: Above The Blur", // 125 d063-v1
  "Supernova Leftovers", // 126 d063-v2
  "Glow Before Dawn", // 127 d064-v1
  "Big Bang: Space Stretched", // 128 d064-v2
  "Our Solar Shield", // 129 d065-v1
  "Far Side Puzzle", // 130 d065-v2
  "CO2 On An Exoplanet", // 131 d066-v1
  "Not A Cosmic Vacuum", // 132 d066-v2
  "Blue Sunset On Mars", // 133 d067-v1
  "Alien Forest, 3 Moons", // 134 d067-v2
  "Stars Made 10x Faster", // 135 d068-v1
  "Closest To The Sun", // 136 d068-v2
  "Planet Seeds In Orion", // 137 d069-v1
  "Most Powerful Bursts", // 138 d069-v2
  "7.5 Earth Laps!", // 139 d070-v1
  "How The Moon Formed", // 140 d070-v2
  "Before The Big Bang?", // 141 d071-v1
  "Ice On Mercury!", // 142 d071-v2
  "Star Pulled Into Ribbon", // 143 d072-v1
  "Why Ice Giants?", // 144 d072-v2
  "Dream Sky: Giant Galaxy", // 145 d073-v1
  "Our Galaxy Family", // 146 d073-v2
  "Bharat Ka Pehla Satellite", // 147 d074-v1
  "Silk Threads Of Light", // 148 d074-v2
  "Big Moon? An Illusion!", // 149 d075-v1
  "Red Dwarfs Everywhere", // 150 d075-v2
  "Future Ring For Mars?", // 151 d076-v1
  "Do Black Holes Evaporate?", // 152 d076-v2
  "Planet Found By Maths", // 153 d077-v1
  "Small Vs Supermassive", // 154 d077-v2
  "Why Pluto Got Demoted", // 155 d078-v1
  "Alien Ice Valley", // 156 d078-v2
  "Over 100 Billion Stars", // 157 d079-v1
  "Vikram's Moon Hop", // 158 d079-v2
  "Twin Balloons Of Gas", // 159 d080-v1
  "Sunspots Are Cooler", // 160 d080-v2
  "The Cosmic Web", // 161 d081-v1
  "The Unseen Icy Cloud", // 162 d081-v2
  "Water From Comets?", // 163 d082-v1
  "5000+ New Worlds", // 164 d082-v2
  "A Sleeping Black Hole", // 165 d083-v1
  "A 10-Hour Day!", // 166 d083-v2
  "Imagine: Glowing Meadow", // 167 d084-v1
  "Third-Largest Neighbor", // 168 d084-v2
  "We Moved An Asteroid", // 169 d085-v1
  "A Butterfly Of Gas", // 170 d085-v2
  "Next Chance: 2117", // 171 d086-v1
  "Blue Is Hotter!", // 172 d086-v2
  "Our Middle-Aged Sun", // 173 d087-v1
  "Cosmic Ray Riddle", // 174 d087-v2
  "Ripples In Spacetime", // 175 d088-v1
  "Two Galaxies Became One", // 176 d088-v2
  "1957: First Satellite!", // 177 d089-v1
  "Always The Same Face", // 178 d089-v2
  "Mercury Is Shrinking", // 179 d090-v1
  "First Black Hole Photo", // 180 d090-v2
];

export default headlines;
