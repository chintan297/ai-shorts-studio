const headlines: string[] = [
  "Red Dress Energy", // 1 d001-v1
  "Goa Beach Glam", // 2 d001-v2
  "Sangeet Glam Look", // 3 d002-v1
  "Alpine Blue Hour", // 4 d002-v2
  "Penthouse Golden Hour", // 5 d003-v1
  "Bronze Smoky Eye", // 6 d003-v2
  "Leopard Is Back", // 7 d004-v1
  "Diwali Wali Chamak", // 8 d004-v2
  "Meet The Emerald Muse", // 9 d005-v1
  "Flash Ready Glam", // 10 d005-v2
  "Udaipur Sunset Saree", // 11 d006-v1
  "Bandra Street Style", // 12 d006-v2
  "Goa Lanes In Lemon", // 13 d007-v1
  "Wine Red Wedding Saree", // 14 d007-v2
  "Andaman Beach Besties", // 15 d008-v1
  "Private Jet Mood", // 16 d008-v2
  "Faux Fur Coat Era", // 17 d009-v1
  "Meet The Silver Muse", // 18 d009-v2
  "Poolside Silver Saree", // 19 d010-v1
  "Shimla Winter Look", // 20 d010-v2
  "Bows Are Trending", // 21 d011-v1
  "Denim On Denim", // 22 d011-v2
  "Cobalt Stepwell Shoot", // 23 d012-v1
  "90s Bouncy Blowout", // 24 d012-v2
  "Santorini In White", // 25 d013-v1
  "Mint Mehendi Mood", // 26 d013-v2
  "Disco Ball Duo", // 27 d014-v1
  "Crochet & Bougainvillea", // 28 d014-v2
  "Sardi Ki Shaadi Look", // 29 d015-v1
  "Neon Alley Nights", // 30 d015-v2
  "Midnight Blue Ballroom", // 31 d016-v1
  "Gold Cut-Crease Eyes", // 32 d016-v2
  "Corset + Baggy Jeans", // 33 d017-v1
  "Orange Satin Showstopper", // 34 d017-v2
  "Overwater Villa Vibes", // 35 d018-v1
  "Black Saree Ka Jalwa", // 36 d018-v2
  "Ski Slope Chic", // 37 d019-v1
  "Desert Gold Goddess", // 38 d019-v2
  "Pink Patent Power", // 39 d020-v1
  "Dulhan Ki Saheliyan", // 40 d020-v2
  "Speakeasy Sequins", // 41 d021-v1
  "Old Money Saree", // 42 d021-v2
  "Emerald On Red Cliffs", // 43 d022-v1
  "Sunrise Workout Fit", // 44 d022-v2
  "Y2K Butterfly Era", // 45 d023-v1
  "Indo-Western Cape Look", // 46 d023-v2
  "Tangerine Pool Day", // 47 d024-v1
  "Mocha Everything", // 48 d024-v2
  "Glass Skin Glow", // 49 d025-v1
  "Sheesh Mahal Lehenga", // 50 d025-v2
  "Black & White Classic", // 51 d026-v1
  "Liquid Gold Saree", // 52 d026-v2
  "Fur & Sequins Duo", // 53 d027-v1
  "Riad Rooftop Lanterns", // 54 d027-v2
  "Red Arch, Black Jumpsuit", // 55 d028-v1
  "Gajra Bun + Jhumkas", // 56 d028-v2
  "Yacht Life Luxe", // 57 d029-v1
  "Cowgirl Road Trip", // 58 d029-v2
  "Pink City Ruffle Saree", // 59 d030-v1
  "Courtside Slip Dress", // 60 d030-v2
  "Beach Club Sunset", // 61 d031-v1
  "Red Cape, First Snow", // 62 d031-v2
  "Blue City Reception", // 63 d032-v1
  "Birthday In Feathers", // 64 d032-v2
  "Kerala Backwater Linen", // 65 d033-v1
  "Paris Rooftop Duo", // 66 d033-v2
  "Dulhan Wala Glow", // 67 d034-v1
  "Burgundy Head To Toe", // 68 d034-v2
  "Boss Lady Mode", // 69 d035-v1
  "Pallu In The Wind", // 70 d035-v2
  "All-White Power Suit", // 71 d036-v1
  "Red Maxi Island Vibes", // 72 d036-v2
  "Luxury Shopping Day", // 73 d037-v1
  "Peach Ombre Lehenga", // 74 d037-v2
  "Retro Polka Dot Era", // 75 d038-v1
  "Ice Cave Puffer", // 76 d038-v2
  "Black & Gold Lehenga", // 77 d039-v1
  "Sunshine In Lilac", // 78 d039-v2
  "Crosswalk Style Duo", // 79 d040-v1
  "Misty Tea Hills Saree", // 80 d040-v2
  "Liquid Silver Disco", // 81 d041-v1
  "Big Bow Energy", // 82 d041-v2
  "Emerald Suit Luxe", // 83 d042-v1
  "Foggy Courtyard Velvet", // 84 d042-v2
  "Mirror Mirror", // 85 d043-v1
  "Goa Shack Sunset", // 86 d043-v2
  "Lavender Cafe Morning", // 87 d044-v1
  "Holiday Party Velvet", // 88 d044-v2
  "Lavender Lehenga Dream", // 89 d045-v1
  "Cherry Cola Lips", // 90 d045-v2
  "Harbour Night Sparkle", // 91 d046-v1
  "Catamaran Day Out", // 92 d046-v2
  "Tropical Print Pop", // 93 d047-v1
  "Oversized Blazer Chic", // 94 d047-v2
  "Sequins & Light Trails", // 95 d048-v1
  "Royal Train Saree", // 96 d048-v2
  "Silk Scarf Curls", // 97 d049-v1
  "Snowy Christmas Red", // 98 d049-v2
  "Red Bow Holiday Gown", // 99 d050-v1
  "Chikankari By Lamplight", // 100 d050-v2
  "Cherry Red Season", // 101 d051-v1
  "Sweater + Sequins", // 102 d051-v2
  "Velvet Gharara Nights", // 103 d052-v1
  "Jungle Pool Sunrise", // 104 d052-v2
  "Coral Jumpsuit Crush", // 105 d053-v1
  "Rooftop Gym Goals", // 106 d053-v2
  "Quiet Luxury Cashmere", // 107 d054-v1
  "Saree + Blazer", // 108 d054-v2
  "New Year Glitter Liner", // 109 d055-v1
  "NYE Sparkler Duo", // 110 d055-v2
  "Lehenga + Jacket Trend", // 111 d056-v1
  "Golden Silhouette Shoot", // 112 d056-v2
  "Velvet Under The Moon", // 113 d057-v1
  "Teal Brocade Glam", // 114 d057-v2
  "Cobalt & White Linen", // 115 d058-v1
  "Black Trench, White Snow", // 116 d058-v2
  "Moonlit White Desert", // 117 d059-v1
  "Pilates Glow Era", // 118 d059-v2
  "Hibiscus By The Sea", // 119 d060-v1
  "Velvet Dinner Date", // 120 d060-v2
  "Rainy Day Trench", // 121 d061-v1
  "Boulder Beach Bliss", // 122 d061-v2
  "Shaadi Guest Glow", // 123 d062-v1
  "Red Neon Halo", // 124 d062-v2
  "Twinning In Leather", // 125 d063-v1
  "Retro Desert Diva", // 126 d063-v2
  "Peach Satin Summer", // 127 d064-v1
  "Haldi Ready", // 128 d064-v2
  "Lake Villa Elegance", // 129 d065-v1
  "Chainmail & Neon", // 130 d065-v2
  "Under The Northern Lights", // 131 d066-v1
  "Butter Yellow Is In", // 132 d066-v2
  "Art Gallery Chic", // 133 d067-v1
  "Olive Cargo Cool", // 134 d067-v2
  "Banarasi & Marigolds", // 135 d068-v1
  "Baarish Aur Coffee", // 136 d068-v2
  "Goa Cliffside Crochet", // 137 d069-v1
  "Lantern-Lit Sharara", // 138 d069-v2
  "Easy Bubble Ponytail", // 139 d070-v1
  "Goa Villa Pool Party", // 140 d070-v2
  "Kite Festival Saree", // 141 d071-v1
  "Roaring 20s Party", // 142 d071-v2
  "Hampi Sunrise Saree", // 143 d072-v1
  "Teddy Coat Season", // 144 d072-v2
  "Sapphire In The Fog", // 145 d073-v1
  "Parandi Wali Choti", // 146 d073-v2
  "Red Shoe Theory", // 147 d074-v1
  "Tulle Gown Fairytale", // 148 d074-v2
  "Sandbar In Tie-Dye", // 149 d075-v1
  "Night At The Opera", // 150 d075-v2
  "Sharara Meets Denim", // 151 d076-v1
  "Leather + Corset Edge", // 152 d076-v2
  "Seaside Taverna Ruffles", // 153 d077-v1
  "Crimson Canal Evening", // 154 d077-v2
  "Beach Shaadi Duo", // 155 d078-v1
  "Plaid Coat Snow Day", // 156 d078-v2
  "Jazz Lounge In Blue", // 157 d079-v1
  "Half-Up Crystal Clip", // 158 d079-v2
  "Barrel Jeans + Gold", // 159 d080-v1
  "Ruby Sequin Saree", // 160 d080-v2
  "Turquoise Hacienda Vibes", // 161 d081-v1
  "Sea Arch Shimmer", // 162 d081-v2
  "Dopamine Dressing", // 163 d082-v1
  "Safari Lodge Luxe", // 164 d082-v2
  "Golden Bokeh Magic", // 165 d083-v1
  "Lilac Cape Saree", // 166 d083-v2
  "Balloons At Sunrise", // 167 d084-v1
  "K-Beauty Berry Glow", // 168 d084-v2
  "Black Or White?", // 169 d085-v1
  "Red Knit, Pink Peaks", // 170 d085-v2
  "Corset Belt Upgrade", // 171 d086-v1
  "Silver Sequin Reception", // 172 d086-v2
  "Misty Morning Athleisure", // 173 d087-v1
  "Palace Lights Lehenga", // 174 d087-v2
  "Sunset Orange Jumpsuit", // 175 d088-v1
  "White Shirt, Red Lip", // 176 d088-v2
  "Colour Smoke Editorial", // 177 d089-v1
  "Riviera Red Trench", // 178 d089-v2
  "Golden Lagoon Days", // 179 d090-v1
  "Lemon Coast Sunset", // 180 d090-v2
];

export default headlines;
