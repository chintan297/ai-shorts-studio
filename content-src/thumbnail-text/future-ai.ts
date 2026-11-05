const headlines: string[] = [
  "2050 Ki Mumbai", // 1 d001-v1
  "Robot Wali Chai", // 2 d001-v2
  "Hyperloop India", // 3 d002-v1
  "AI Translator Earbuds", // 4 d002-v2
  "Ek Wave, Dhoop Off", // 5 d003-v1
  "Rocket Laut Aaya!", // 6 d003-v2
  "Office In Munnar", // 7 d004-v1
  "3D Printed Ghar", // 8 d004-v2
  "Hawa Se Paani", // 9 d005-v1
  "Dharti Par Suraj", // 10 d005-v2
  "Badalon Par Pul", // 11 d006-v1
  "Goa Ki Floating City", // 12 d006-v2
  "Robot Kisan", // 13 d007-v1
  "Traffic Ke Upar Car", // 14 d007-v2
  "AI Body Scan", // 15 d008-v1
  "Magic Wala Flat", // 16 d008-v2
  "Chaand Par Ghar", // 17 d009-v1
  "Printed Nashta", // 18 d009-v2
  "Baadh Mein Tairta Ghar", // 19 d010-v1
  "Insaan Ab Udega!", // 20 d010-v2
  "Sadak Se Charging", // 21 d011-v1
  "Udte Tapu, Coorg", // 22 d011-v2
  "Clean Air Delhi", // 23 d012-v1
  "Coral Ka Maali", // 24 d012-v2
  "Kerala Ki Smart Ferry", // 25 d013-v1
  "Machhuaron Ka AI Raasta", // 26 d013-v2
  "Khaprail Bani Solar", // 27 d014-v1
  "Space Tak Lift", // 28 d014-v2
  "Supermarket Mein Kheti", // 29 d015-v1
  "Bamboo Skyscraper", // 30 d015-v2
  "Hands-Free Chhata", // 31 d016-v1
  "Socho Aur Chalao", // 32 d016-v2
  "Aasmaan Tak Kheti", // 33 d017-v1
  "Arctic Dome City", // 34 d017-v2
  "Dadi Ka Robot", // 35 d018-v1
  "603 Kmph Maglev", // 36 d018-v2
  "AI Banayega Dawa", // 37 d019-v1
  "Kitchen Ki Hari Deewar", // 38 d019-v2
  "Space Se Bijli", // 39 d020-v1
  "Gym Mein Himalaya", // 40 d020-v2
  "Mushroom Ki Imaarat", // 41 d021-v1
  "Udta Skateboard", // 42 d021-v2
  "Quantum Ka Jhoomar", // 43 d022-v1
  "Mughal Space Station", // 44 d022-v2
  "2060 Ka Banaras", // 45 d023-v1
  "Barf Mein Robot Dog", // 46 d023-v2
  "Airship Delivery", // 47 d024-v1
  "Baagh Ka Rakhwala", // 48 d024-v2
  "Balcony Mein Parcel", // 49 d025-v1
  "Mars Ki Pehli Salad", // 50 d025-v2
  "Airport Sleep Pod", // 51 d026-v1
  "Phool Jaisi Building", // 52 d026-v2
  "Charger Wale Joote", // 53 d027-v1
  "Aankh Mein GPS", // 54 d027-v2
  "Ped Bane Streetlight", // 55 d028-v1
  "2070 Ka Jaisalmer", // 56 d028-v2
  "Robot Halwai", // 57 d029-v1
  "Undersea Glass Train", // 58 d029-v2
  "Na Signal, Na Jam", // 59 d030-v1
  "Saans Leta Ghar", // 60 d030-v2
  "Gravity Ka Jugaad", // 61 d031-v1
  "Driver Kaun Hai?", // 62 d031-v2
  "Jodhpur Ka Baori Tower", // 63 d032-v1
  "Wristband Drone", // 64 d032-v2
  "Printed Heart Patch", // 65 d033-v1
  "Whale Airship Hotel", // 66 d033-v2
  "Coral Reef Pe Shehar", // 67 d034-v1
  "Spider Robot", // 68 d034-v2
  "Driverless Auto", // 69 d035-v1
  "Ishaaron Ko Awaaz", // 70 d035-v2
  "Mirror Bataye Health", // 71 d036-v1
  "Asteroid Pe Khudai", // 72 d036-v2
  "Manta Wala Breakfast", // 73 d037-v1
  "Cliff Pe Glass Hotel", // 74 d037-v2
  "Gaddha Alert Helmet", // 75 d038-v1
  "Paint Se Roshni", // 76 d038-v2
  "Pahad Ke Andar Shehar", // 77 d039-v1
  "Garden City Returns", // 78 d039-v2
  "Bojh Hua Halka", // 79 d040-v1
  "Hydrogen Flying Wing", // 80 d040-v2
  "Gaon Ki AI Class", // 81 d041-v1
  "Bijli Share Karo", // 82 d041-v2
  "Space Kachra Saaf!", // 83 d042-v1
  "Sofa Pe Live Kathak", // 84 d042-v2
  "Self-Healing Bridge", // 85 d043-v1
  "Scroll Wali Screen", // 86 d043-v2
  "Khaara Paani Hua Meetha", // 87 d044-v1
  "Thar Mein Solar Phool", // 88 d044-v2
  "Ladakh Solar City", // 89 d045-v1
  "Galiyon Ka Delivery Bot", // 90 d045-v2
  "Shimla Sky Metro", // 91 d046-v1
  "Remote Surgery", // 92 d046-v2
  "Baarish Ka Bank", // 93 d047-v1
  "Solar Sail Spaceship", // 94 d047-v2
  "Glowing Yoga Mat", // 95 d048-v1
  "Underground Garden Home", // 96 d048-v2
  "Dhoop Se Pakega Khana", // 97 d049-v1
  "Vizag Ka Digital Twin", // 98 d049-v2
  "Udti Kitaabein", // 99 d050-v1
  "Cars Nahi, Gardens", // 100 d050-v2
  "Robot Goalkeeper", // 101 d051-v1
  "Delhi-NY Via Space", // 102 d051-v2
  "AI Bionic Hand", // 103 d052-v1
  "Hologram Dada-Dadi", // 104 d052-v2
  "Chaand Ki Gufa Mein", // 105 d053-v1
  "AR Lehenga Trial", // 106 d053-v2
  "Floating Water-Scraper", // 107 d054-v1
  "Briefcase Bike", // 108 d054-v2
  "Dhuan Nahi, Paani", // 109 d055-v1
  "Lonar Ring City", // 110 d055-v2
  "Aizawl Ki Glass Lift", // 111 d056-v1
  "Robot Madhumakkhi", // 112 d056-v2
  "Solar Roof Highway", // 113 d057-v1
  "AI Cricket Coach", // 114 d057-v2
  "Sun-Chasing House", // 115 d058-v1
  "Venus Cloud Station", // 116 d058-v2
  "Din Mein 16 Sunrise", // 117 d059-v1
  "Transparent Wood House", // 118 d059-v2
  "Jacket Mein AC", // 119 d060-v1
  "Glowing Skin Patch", // 120 d060-v2
  "Pedon Par Gaon", // 121 d061-v1
  "Sponge City Kochi", // 122 d061-v2
  "Robot Ka Tabla", // 123 d062-v1
  "Loktak Par Seaplane", // 124 d062-v2
  "AI Kachra Sorter", // 125 d063-v1
  "Billi Ka Smart Home", // 126 d063-v2
  "Sone Ka Aaina", // 127 d064-v1
  "AR Khazana Khoj", // 128 d064-v2
  "Chhupi Hui Building", // 129 d065-v1
  "Bubble Helmet Scooter", // 130 d065-v2
  "Khidkiyon Ka Power Plant", // 131 d066-v1
  "Sitaron Ki Seedhi", // 132 d066-v2
  "Bina AC Thanda", // 133 d067-v1
  "Ped Lagata Robot", // 134 d067-v2
  "Lehron Par Udaan", // 135 d068-v1
  "Drawing Bani Hologram", // 136 d068-v2
  "Off-Grid Snow Cabin", // 137 d069-v1
  "Satellite Ka Refuel", // 138 d069-v2
  "Drone Ka Kamal", // 139 d070-v1
  "Chhate Wali Library", // 140 d070-v2
  "Seconds Mein Tent", // 141 d071-v1
  "Ret Ki Battery", // 142 d071-v2
  "Neela Mars?", // 143 d072-v1
  "Kolkata 2050", // 144 d072-v2
  "Humanoid Sculptor", // 145 d073-v1
  "Cycle Ka Skyway", // 146 d073-v2
  "AI Smart Grid", // 147 d074-v1
  "Kota Ka Focus Room", // 148 d074-v2
  "Gubbare Jaisa Ghar", // 149 d075-v1
  "Dhund Pe Cinema", // 150 d075-v2
  "Pairon Wala Station", // 151 d076-v1
  "Patton Se Bijli", // 152 d076-v2
  "CO2 Bana Patthar", // 153 d077-v1
  "Jharnon Ka Shehar", // 154 d077-v2
  "Tairte Baag, Saaf Nadi", // 155 d078-v1
  "Aankhon Ka Saathi", // 156 d078-v2
  "Sote-Sote Safar", // 157 d079-v1
  "Samandar Ki Safai", // 158 d079-v2
  "Recycling Shower", // 159 d080-v1
  "Europa Ka Samandar?", // 160 d080-v2
  "Roshni Ke Saath Race", // 161 d081-v1
  "Jadon Ka Pul", // 162 d081-v2
  "Har Kadam Pe Power", // 163 d082-v1
  "Bulb Se Internet", // 164 d082-v2
  "Hampi Phir Zinda", // 165 d083-v1
  "Jam-Free Chandigarh", // 166 d083-v2
  "Bina Paani Safai", // 167 d084-v1
  "Pahadon Ki Air Ambulance", // 168 d084-v2
  "Mitti Ka Doctor", // 169 d085-v1
  "Ek Taali, Smart Diwali", // 170 d085-v2
  "Mars Ke Helicopter", // 171 d086-v1
  "Chamakti Patangein", // 172 d086-v2
  "Lotus Roof Stadium", // 173 d087-v1
  "Kerala Ki Glow Road", // 174 d087-v2
  "Jwaar-Bhaata Power", // 175 d088-v1
  "Dharti Ki Angoothi", // 176 d088-v2
  "1 Km Uncha Shehar", // 177 d089-v1
  "Mural Sanwarta Robot", // 178 d089-v2
  "Bina Patri Tram", // 179 d090-v1
  "Roshni Wali Kahani", // 180 d090-v2
];

export default headlines;
