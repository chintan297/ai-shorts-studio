const headlines: string[] = [
  "Momo's First Snow", // 1 d001-v1
  "King At Dawn", // 2 d001-v2
  "Flies Backwards!", // 3 d002-v1
  "Magic Crystal Deer", // 4 d002-v2
  "Brave Momo Makes It!", // 5 d003-v1
  "Home Sweet Anemone", // 6 d003-v2
  "Pangong Turns Turquoise", // 7 d004-v1
  "Thousands Of Fireflies", // 8 d004-v2
  "Whoosh! Great Hornbill", // 9 d005-v1
  "Dolphin Spins Midair!", // 10 d005-v2
  "Tide In The Mangroves", // 11 d006-v1
  "Wall Of Rain!", // 12 d006-v2
  "Valley Of Flowers", // 13 d007-v1
  "Whale In The Sky!", // 14 d007-v2
  "Pebble Can Juggle!", // 15 d008-v1
  "Humpback Mega Leap!", // 16 d008-v2
  "Sarus Love Dance", // 17 d009-v1
  "Shimmering Fish Cloud", // 18 d009-v2
  "Tail Becomes Blanket!", // 19 d010-v1
  "Gir's Royal Family", // 20 d010-v2
  "Pebble's Leaf Boat", // 21 d011-v1
  "Floating Islands!", // 22 d011-v2
  "Bird Of Many Colors", // 23 d012-v1
  "Silent Valley Rain", // 24 d012-v2
  "Manta Takes Flight", // 25 d013-v1
  "Race To The Sea!", // 26 d013-v2
  "Tiny Lotus Dragon", // 27 d014-v1
  "Forest Under The Sea", // 28 d014-v2
  "Desert Lightning!", // 29 d015-v1
  "Momo's Power Nap", // 30 d015-v2
  "Wolves Of The Deccan", // 31 d016-v1
  "Moonlit White Rann", // 32 d016-v2
  "Almost Blind Dolphin!", // 33 d017-v1
  "Pebble Vs Pebble!", // 34 d017-v2
  "Bharatpur Bird Heaven", // 35 d018-v1
  "World's Rhino Capital", // 36 d018-v2
  "Fish Or Painting?", // 37 d019-v1
  "Kanchenjunga At Sunrise", // 38 d019-v2
  "Web Of Diamonds", // 39 d020-v1
  "Momo's Treetop Sunrise", // 40 d020-v2
  "Meet The Sea Cow", // 41 d021-v1
  "Leopard's Sunset Rock", // 42 d021-v2
  "Flash Of Blue!", // 43 d022-v1
  "Rise Of The Firebird", // 44 d022-v2
  "Blue Hour Polar Bear", // 45 d023-v1
  "Mud Bath Time!", // 46 d023-v2
  "Sea Of Milk Falls", // 47 d024-v1
  "Kingfisher Shake-Off!", // 48 d024-v2
  "Not A Tail!", // 49 d025-v1
  "Orca Family Time", // 50 d025-v2
  "Fox Made Of Leaves", // 51 d026-v1
  "Kaas Flower Carpet", // 52 d026-v2
  "Pebble's Secret Cave", // 53 d027-v1
  "Neon Blue Waves!", // 54 d027-v2
  "Master Of Colors", // 55 d028-v1
  "Watch A Lotus Bloom", // 56 d028-v2
  "Gold Of The River", // 57 d029-v1
  "Amazon's Green Sea", // 58 d029-v2
  "Holding Mom's Tail", // 59 d030-v1
  "Dhole Playtime!", // 60 d030-v2
  "Momo Vs Dandelion", // 61 d031-v1
  "Whales Sleep Standing!", // 62 d031-v2
  "Koi Floating In Air", // 63 d032-v1
  "No Two Stripes Alike", // 64 d032-v2
  "Golden Sea Of Sand", // 65 d033-v1
  "Ribbon-Tailed Beauty", // 66 d033-v2
  "Milky Way Over Ladakh", // 67 d034-v1
  "Pot On Its Nose!", // 68 d034-v2
  "Radhanagar Golden Hour", // 69 d035-v1
  "Forest On Its Back", // 70 d035-v2
  "Momo Follows The Glow", // 71 d036-v1
  "Blackbuck High Jump!", // 72 d036-v2
  "Over The Himalayas", // 73 d037-v1
  "Yes, Fish Can Glide!", // 74 d037-v2
  "Pebble's Lotus Umbrella", // 75 d038-v1
  "Underwater Light Show", // 76 d038-v2
  "Arctic Autumn Colors", // 77 d039-v1
  "Three Fluffy Owlets", // 78 d039-v2
  "Blue Ice Lagoon", // 79 d040-v1
  "Owl Full Of Stars", // 80 d040-v2
  "Weaves Its Own Home", // 81 d041-v1
  "Ocean's Dentist!", // 82 d041-v2
  "No Water In Humps!", // 83 d042-v1
  "Pebble's First Dive", // 84 d042-v2
  "Playful Sea Lion Pup", // 85 d043-v1
  "Desert Water Paradise", // 86 d043-v2
  "Feathers Of Frost", // 87 d044-v1
  "Gaur In The Mist", // 88 d044-v2
  "Upside-Down Snow!", // 89 d045-v1
  "Dancing Northern Lights", // 90 d045-v2
  "Moon Lake Of Spiti", // 91 d046-v1
  "Tiger Of Blue Light", // 92 d046-v2
  "Gentle Giant", // 93 d047-v1
  "Puffin Couple Goals", // 94 d047-v2
  "Inside A Blue Glacier", // 95 d048-v1
  "New Best Friends!", // 96 d048-v2
  "Drifting Moon Jellies", // 97 d049-v1
  "Momo Goes Sledding!", // 98 d049-v2
  "Walking Pine Cone!", // 99 d050-v1
  "Roly-Poly Panda!", // 100 d050-v2
  "Smiling White Belugas", // 101 d051-v1
  "Dad Gives Birth!", // 102 d051-v2
  "Stone Pillars In Mist", // 103 d052-v1
  "Teacup-Size Elephant!", // 104 d052-v2
  "Little Cliff Champion", // 105 d053-v1
  "Monkey With A Mane", // 106 d053-v2
  "Jog Falls Rainbow", // 107 d054-v1
  "Colorful Sea Slug", // 108 d054-v2
  "Shiny Purple Sunbird", // 109 d055-v1
  "Mushrooms That Glow!", // 110 d055-v2
  "A Fish That Sunbathes", // 111 d056-v1
  "Mud Slide, Again!", // 112 d056-v2
  "Peekaboo Penguin Chick!", // 113 d057-v1
  "Pebble's Mangrove Maze", // 114 d057-v2
  "Serengeti Sunrise", // 115 d058-v1
  "Lagoon Water Dragon", // 116 d058-v2
  "Head-Down Breakfast!", // 117 d059-v1
  "Meghalaya's Mighty Falls", // 118 d059-v2
  "Outback Athlete!", // 119 d060-v1
  "Glowing Giant Clam", // 120 d060-v2
  "Munnar Turns Blue!", // 121 d061-v1
  "Great Indian Bustard", // 122 d061-v2
  "Biggest Fish On Earth", // 123 d062-v1
  "Patagonia Glows Red", // 124 d062-v2
  "River Of Lava", // 125 d063-v1
  "Momo The Puffball!", // 126 d063-v2
  "Firefly Fawn", // 127 d064-v1
  "Under The Lotus Pond", // 128 d064-v2
  "Friendship Boat!", // 129 d065-v1
  "A School Of Hammerheads", // 130 d065-v2
  "Galloping In The Rann", // 131 d066-v1
  "Kingdom Of Moss", // 132 d066-v2
  "Marmot Pups Pop Up!", // 133 d067-v1
  "Living Root Bridge", // 134 d067-v2
  "Waterfall Of Clouds", // 135 d068-v1
  "Round-Headed Dolphin", // 136 d068-v2
  "Crystal Ice Wolf", // 137 d069-v1
  "Velvet Green Hills", // 138 d069-v2
  "Rainbow Mantis Shrimp", // 139 d070-v1
  "Tree-Top Acrobat!", // 140 d070-v2
  "Saanpon Ka Raja", // 141 d071-v1
  "Bear's Acorn Feast", // 142 d071-v2
  "Those Orange Eyes!", // 143 d072-v1
  "Path Of Red Petals", // 144 d072-v2
  "Lantern Sea Dragon", // 145 d073-v1
  "Momo's Secret Tunnel", // 146 d073-v2
  "Unicorns Of The Sea", // 147 d074-v1
  "Giant Wings Over Spiti", // 148 d074-v2
  "It Regrows Its Arm!", // 149 d075-v1
  "Pebble's Treasure", // 150 d075-v2
  "Stripes In The Mirror", // 151 d076-v1
  "Hampi Wakes Up", // 152 d076-v2
  "Gulmarg Snowfall Magic", // 153 d077-v1
  "Rainbow In The Deep", // 154 d077-v2
  "Desert Guardians", // 155 d078-v1
  "Peacock Of Water", // 156 d078-v2
  "Momo's Leaf Party!", // 157 d079-v1
  "Belly Flop Rays!", // 158 d079-v2
  "Tallest On Land!", // 159 d080-v1
  "Queen Pebble!", // 160 d080-v2
  "Sky Full Of Falcons", // 161 d081-v1
  "Angel Under The Ice", // 162 d081-v2
  "Valley Of Waterfalls", // 163 d082-v1
  "Shy Clouded Leopard", // 164 d082-v2
  "Deer In Golden Light", // 165 d083-v1
  "Eaglenest Cloud Forest", // 166 d083-v2
  "Fish Whirlpool!", // 167 d084-v1
  "Piggyback Ride!", // 168 d084-v2
  "India's Grand Canyon", // 169 d085-v1
  "Mom And Baby Whale", // 170 d085-v2
  "Good Morning Squad!", // 171 d086-v1
  "Biggest Animal Ever!", // 172 d086-v2
  "Double Rainbow!", // 173 d087-v1
  "Starlight Yak", // 174 d087-v2
  "Above The Clouds", // 175 d088-v1
  "Big Ears, Big Fun!", // 176 d088-v2
  "Americas' Biggest Cat", // 177 d089-v1
  "Head Never Goes In!", // 178 d089-v2
  "Emerald Jewel Bird", // 179 d090-v1
  "Good Night, Doston!", // 180 d090-v2
];

export default headlines;
