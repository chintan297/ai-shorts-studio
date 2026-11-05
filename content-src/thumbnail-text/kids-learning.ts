const headlines: string[] = [
  "A For Apple", // 1 d001-v1
  "Count 1, 2, 3!", // 2 d001-v2
  "Where Did Ice Go?", // 3 d002-v1
  "Cow Says Moo!", // 4 d002-v2
  "Sharing Is Caring", // 5 d003-v1
  "Big Or Small?", // 6 d003-v2
  "Red Like Strawberries", // 7 d004-v1
  "B For Ball", // 8 d004-v2
  "Circle Like A Roti", // 9 d005-v1
  "Splash Splash Chiku!", // 10 d005-v2
  "Off To The Moon!", // 11 d006-v1
  "Wash Your Hands!", // 12 d006-v2
  "1 Big Pumpkin!", // 13 d007-v1
  "Chick From An Egg!", // 14 d007-v2
  "C For Cat", // 15 d008-v1
  "Say Sorry!", // 16 d008-v2
  "How Do Plants Grow?", // 17 d009-v1
  "Up And Down!", // 18 d009-v2
  "Blue Like Chiku!", // 19 d010-v1
  "Square Has 4 Sides", // 20 d010-v2
  "Night Night, Bholu", // 21 d011-v1
  "D For Duck", // 22 d011-v2
  "We Found Treasure!", // 23 d012-v1
  "Brush Your Teeth!", // 24 d012-v2
  "2 Little Birds", // 25 d013-v1
  "Tadpole To Frog!", // 26 d013-v2
  "Say Thank You!", // 27 d014-v1
  "Why Does Rice Dance?", // 28 d014-v2
  "E For Elephant", // 29 d015-v1
  "Hot Or Cold?", // 30 d015-v2
  "Yellow Like A Sunflower", // 31 d016-v1
  "Triangle Like A Tent", // 32 d016-v2
  "Dance In The Rain!", // 33 d017-v1
  "We Made A Snowman!", // 34 d017-v2
  "Happy Or Sad?", // 35 d018-v1
  "F For Flower", // 36 d018-v2
  "Count 4 Balloons!", // 37 d019-v1
  "Caterpillar To Butterfly", // 38 d019-v2
  "Chiku Helps Mini!", // 39 d020-v1
  "How Are Shadows Made?", // 40 d020-v2
  "Open Or Close?", // 41 d021-v1
  "Green Like Peas!", // 42 d021-v2
  "G For Grapes", // 43 d022-v1
  "Rectangle Like A Book", // 44 d022-v2
  "Clap Your Hands!", // 45 d023-v1
  "5 Pretty Petals", // 46 d023-v2
  "How Is Honey Made?", // 47 d024-v1
  "Wait For Your Turn", // 48 d024-v2
  "Firefly Night Walk", // 49 d025-v1
  "H For House", // 50 d025-v2
  "See, Hear, Smell!", // 51 d026-v1
  "How Magnets Work", // 52 d026-v2
  "Fast Or Slow?", // 53 d027-v1
  "6 Little Ladybugs", // 54 d027-v2
  "Who Is The Tallest?", // 55 d028-v1
  "Bholu Tells The Truth", // 56 d028-v2
  "I For Igloo", // 57 d029-v1
  "Orange Like Marigolds", // 58 d029-v2
  "Star Like A Starfish", // 59 d030-v1
  "Hop Hop Bholu!", // 60 d030-v2
  "Float Or Sink?", // 61 d031-v1
  "Full Or Empty?", // 62 d031-v2
  "Magic Paintbrush!", // 63 d032-v1
  "J For Jug", // 64 d032-v2
  "Summer, Rain, Winter", // 65 d033-v1
  "7 Twinkly Stars", // 66 d033-v2
  "Penguins Can't Fly!", // 67 d034-v1
  "Kind Chiku, Happy Puppy", // 68 d034-v2
  "Purple Like Brinjal", // 69 d035-v1
  "Heart-Shaped Leaf!", // 70 d035-v2
  "K For Kite", // 71 d036-v1
  "Tummy Drum Dance!", // 72 d036-v2
  "How Rainbows Are Made", // 73 d037-v1
  "In Or Out?", // 74 d037-v2
  "Octopus Has 8 Arms", // 75 d038-v1
  "Baby In A Pouch!", // 76 d038-v2
  "A Hug For Bholu", // 77 d039-v1
  "L For Lemon", // 78 d039-v2
  "Secret Tree Door!", // 79 d040-v1
  "Car, Bus, Train!", // 80 d040-v2
  "Pink Like A Lotus", // 81 d041-v1
  "Oval Like An Egg", // 82 d041-v2
  "Peek-A-Boo, Bholu!", // 83 d042-v1
  "Sun Is A Star!", // 84 d042-v2
  "M For Mango", // 85 d043-v1
  "Tall Or Short?", // 86 d043-v2
  "9 Little Ducklings", // 87 d044-v1
  "Tortoise's Hard Shell", // 88 d044-v2
  "Bholu Shares Carrots", // 89 d045-v1
  "Sandcastle Fun!", // 90 d045-v2
  "Use The Dustbin!", // 91 d046-v1
  "N For Nest", // 92 d046-v2
  "10 Little Fingers", // 93 d047-v1
  "Peacock Feathers!", // 94 d047-v2
  "Thank You, Mini!", // 95 d048-v1
  "Why The Moon Shines", // 96 d048-v2
  "Name The Fruits!", // 97 d049-v1
  "Brown Like A Coconut", // 98 d049-v2
  "O For Owl", // 99 d050-v1
  "Shiny Diamond Shape", // 100 d050-v2
  "Left Right Parade!", // 101 d051-v1
  "Sofa Pirate Ship!", // 102 d051-v2
  "Drink Water!", // 103 d052-v1
  "Jump 5 Times!", // 104 d052-v2
  "Sniff Sniff Puppy!", // 105 d053-v1
  "P For Parrot", // 106 d053-v2
  "Oops! Sorry, Gyanu!", // 107 d054-v1
  "Seed To Sprout!", // 108 d054-v2
  "Name The Veggies!", // 109 d055-v1
  "White Like A Cloud", // 110 d055-v2
  "Hexagon Has 6 Sides", // 111 d056-v1
  "Pop Pop Bubbles!", // 112 d056-v2
  "Q For Quilt", // 113 d057-v1
  "Count 3 Butterflies", // 114 d057-v2
  "Why Squirrels Save Nuts", // 115 d058-v1
  "Tidy Up Your Toys", // 116 d058-v2
  "Jump In The Leaves!", // 117 d059-v1
  "Drum, Flute, Bell!", // 118 d059-v2
  "Bye Bye, Puddle!", // 119 d060-v1
  "R For Rabbit", // 120 d060-v2
  "Head, Nose, Hands, Feet", // 121 d061-v1
  "Black Like A Crow", // 122 d061-v2
  "Crescent Moon Shape", // 123 d062-v1
  "Good Morning Stretch!", // 124 d062-v2
  "Count 5 Crayons!", // 125 d063-v1
  "Fish Breathe With Gills", // 126 d063-v2
  "S For Sun", // 127 d064-v1
  "Let Me Help!", // 128 d064-v2
  "How Does Rain Fall?", // 129 d065-v1
  "Animal Babies!", // 130 d065-v2
  "Flower Train Ride!", // 131 d066-v1
  "Sneeze Into Your Elbow", // 132 d066-v2
  "Grey Like Pigeons", // 133 d067-v1
  "T For Train", // 134 d067-v2
  "Half A Circle!", // 135 d068-v1
  "Count 1 To 10!", // 136 d068-v2
  "Pandas Love Bamboo!", // 137 d069-v1
  "Keep Trying, Chiku!", // 138 d069-v2
  "Wiggle Wiggle Freeze!", // 139 d070-v1
  "Wind Makes It Spin!", // 140 d070-v2
  "U For Umbrella", // 141 d071-v1
  "Match The Socks!", // 142 d071-v2
  "Bholu In A Bubble!", // 143 d072-v1
  "Time For Bed!", // 144 d072-v2
  "1+1 Makes 2!", // 145 d073-v1
  "How Elephants Drink", // 146 d073-v2
  "Mini Returns The Ball", // 147 d074-v1
  "V For Violin", // 148 d074-v2
  "Mix Blue And Yellow!", // 149 d075-v1
  "Cube Has 6 Faces", // 150 d075-v2
  "Flap Flap Dance!", // 151 d076-v1
  "Why Things Fall Down", // 152 d076-v2
  "What Comes Next?", // 153 d077-v1
  "More Or Less?", // 154 d077-v2
  "W For Watermelon", // 155 d078-v1
  "Days Without Water!", // 156 d078-v2
  "Come, Play Together!", // 157 d079-v1
  "Surprise Picnic!", // 158 d079-v2
  "Parts Of A Plant", // 159 d080-v1
  "Mix Red And Yellow!", // 160 d080-v2
  "Party Hat Cone!", // 161 d081-v1
  "X For Xylophone", // 162 d081-v2
  "Toot Toot Chiku!", // 163 d082-v1
  "Thump Thump Heart!", // 164 d082-v2
  "Left Or Right?", // 165 d083-v1
  "0 Means Nothing!", // 166 d083-v2
  "Polar Bear Stays Warm", // 167 d084-v1
  "Be Gentle With Flowers", // 168 d084-v2
  "Y For Yak", // 169 d085-v1
  "Paper Boat Fun!", // 170 d085-v2
  "Who Lives Where?", // 171 d086-v1
  "Mix Red And White!", // 172 d086-v2
  "Shape Sorter Fun!", // 173 d087-v1
  "Crunch Crunch Bholu!", // 174 d087-v2
  "Why Day And Night?", // 175 d088-v1
  "Z For Zebra", // 176 d088-v2
  "Heavy Or Light?", // 177 d089-v1
  "Countdown From 5!", // 178 d089-v2
  "From Sheep To Sweater", // 179 d090-v1
  "Say Please!", // 180 d090-v2
];

export default headlines;
