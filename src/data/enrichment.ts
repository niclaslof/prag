import { Place } from "@/lib/types";

/**
 * Hand-curated editorial enrichment for Prague places.
 * Keyed by numeric place ID, merged in places.ts.
 */
export const ENRICHMENT: Record<number, Partial<Place>> = {
  // ══════════════════════════════════════════════════════════════════
  // RESTAURANTS
  // ══════════════════════════════════════════════════════════════════

  // 1: Lokal Dlouhááá
  1: {
    signatureDishes: ["Tank Pilsner Urquell", "Svickova na smetane", "Beef tartare on toast"],
    insiderTip: "Arrive by 11:30 to snag a table without waiting -- the lunch rush fills every seat by noon.",
    bestFor: ["budget", "first-time", "groups", "locals"],
    vibe: ["lively", "authentic", "local"],
    outdoorSeating: false,
    dogFriendly: false,
    wifiAvailable: true,
    laptopFriendly: false,
    openSince: 2012,
  },

  // 2: Field
  2: {
    signatureDishes: ["Seasonal tasting menu", "Fermented vegetables course", "Czech cheese selection"],
    insiderTip: "Book the counter seats facing the open kitchen -- you'll get commentary from the chefs between courses.",
    bestFor: ["couple", "splurge", "business"],
    vibe: ["modern", "elegant", "quiet"],
    dressCode: "smart casual",
    reservationUrl: "https://www.fieldrestaurant.cz/reservation",
    outdoorSeating: false,
    dogFriendly: false,
    wifiAvailable: true,
    laptopFriendly: false,
    openSince: 2015,
  },

  // 3: La Degustation Boheme Bourgeoise
  3: {
    signatureDishes: ["7-course Czech degustation", "Pike perch with kohlrabi", "Bohemian duck liver"],
    insiderTip: "Request the wine pairing with Czech-only wines -- the sommelier curates bottles you cannot find outside Moravia.",
    bestFor: ["couple", "splurge", "business"],
    vibe: ["elegant", "quiet", "historic"],
    dressCode: "smart casual",
    reservationUrl: "https://www.ladegustation.cz/en/reservation/",
    outdoorSeating: false,
    dogFriendly: false,
    wifiAvailable: false,
    laptopFriendly: false,
    openSince: 2006,
  },

  // 4: Eska
  4: {
    signatureDishes: ["Sourdough bread with cultured butter", "Fermented mushroom broth", "Hay-smoked trout"],
    insiderTip: "The ground-floor bakery counter sells the same sourdough loaves from brunch at half the sit-down price.",
    bestFor: ["couple", "groups", "locals"],
    vibe: ["modern", "lively", "instagram"],
    outdoorSeating: true,
    dogFriendly: false,
    wifiAvailable: true,
    laptopFriendly: true,
    openSince: 2015,
  },

  // 5: Sansho
  5: {
    signatureDishes: ["No-menu surprise tasting", "Sichuan pork belly bao", "Yuzu curd dessert"],
    insiderTip: "There is no a-la-carte -- just tell them your allergies and let the kitchen decide; the 6-course is the sweet spot.",
    bestFor: ["couple", "splurge", "locals"],
    vibe: ["modern", "lively", "authentic"],
    dressCode: "smart casual",
    outdoorSeating: false,
    dogFriendly: false,
    wifiAvailable: false,
    laptopFriendly: false,
    openSince: 2011,
  },

  // 6: V Zatisi
  6: {
    signatureDishes: ["Chocolate tasting plate", "Venison with root vegetables", "Degustation menu"],
    insiderTip: "Ask for the window table overlooking Betlemske namesti -- it seats two and has the best light at dinner.",
    bestFor: ["couple", "business", "splurge"],
    vibe: ["elegant", "romantic", "quiet"],
    dressCode: "smart casual",
    reservationUrl: "https://www.vzatisi.cz/en/reservation",
    outdoorSeating: false,
    dogFriendly: false,
    wifiAvailable: true,
    laptopFriendly: false,
    openSince: 1991,
  },

  // 7: U Modre Kachnicky
  7: {
    signatureDishes: ["Roast duck with red cabbage", "Wild game platter", "Becherovka sorbet"],
    insiderTip: "Book the vaulted cellar room downstairs for two -- it feels like your own medieval dining hall.",
    bestFor: ["couple", "first-time", "splurge"],
    vibe: ["romantic", "historic", "cozy"],
    dressCode: "smart casual",
    outdoorSeating: false,
    dogFriendly: false,
    wifiAvailable: false,
    laptopFriendly: false,
    openSince: 1994,
  },

  // 8: Cafe Savoy
  8: {
    signatureDishes: ["Eggs Benedict", "Medovnik honey cake", "French toast with berries"],
    insiderTip: "Weekend brunch queues start at 9:15 -- come at 8:30 sharp when the doors open to sit under the restored Neo-Renaissance ceiling.",
    bestFor: ["couple", "first-time", "families"],
    vibe: ["elegant", "historic", "instagram"],
    outdoorSeating: false,
    dogFriendly: false,
    wifiAvailable: true,
    laptopFriendly: false,
    openSince: 1893,
  },

  // 9: Lehka Hlava (Clear Head)
  9: {
    signatureDishes: ["Coconut curry with tempeh", "Beetroot burger", "Raw chocolate cake"],
    insiderTip: "Sit in the rear courtyard under the vine-covered glass roof -- the front room is darker and noisier.",
    bestFor: ["solo", "couple", "budget"],
    vibe: ["cozy", "quiet", "authentic"],
    outdoorSeating: true,
    dogFriendly: false,
    wifiAvailable: true,
    laptopFriendly: true,
    openSince: 2003,
  },

  // 10: Kantyna
  10: {
    signatureDishes: ["Dry-aged rib-eye steak", "Bone marrow on toast", "Beef tartare from the counter"],
    insiderTip: "Walk past the butcher counter and point at the exact cut you want -- they will grill it to order on the spot.",
    bestFor: ["solo", "groups", "budget", "locals"],
    vibe: ["lively", "modern", "gritty"],
    outdoorSeating: false,
    dogFriendly: false,
    wifiAvailable: true,
    laptopFriendly: false,
    openSince: 2014,
  },

  // 11: La Finestra in Cucina
  11: {
    signatureDishes: ["Bistecca Fiorentina", "Homemade burrata", "Tiramisu"],
    insiderTip: "Ask the waiter to show you the dry-aging cabinet -- they will walk you through the cuts and help you pick by marbling.",
    bestFor: ["couple", "business", "splurge"],
    vibe: ["elegant", "romantic", "quiet"],
    dressCode: "smart casual",
    reservationUrl: "https://www.lafinestra.cz/en/reservation",
    outdoorSeating: false,
    dogFriendly: false,
    wifiAvailable: true,
    laptopFriendly: false,
    openSince: 2010,
  },

  // 12: Bellevue
  12: {
    signatureDishes: ["Sunday Jazz Brunch buffet", "Pan-seared sea bass", "Chocolate fondant"],
    insiderTip: "The Sunday jazz brunch (11-15:00) gets you a river view, live trio, and unlimited prosecco for under 1500 CZK.",
    bestFor: ["couple", "business", "first-time", "splurge"],
    vibe: ["elegant", "romantic", "instagram"],
    dressCode: "smart casual",
    sunsetSpot: true,
    outdoorSeating: true,
    dogFriendly: false,
    wifiAvailable: true,
    laptopFriendly: false,
    openSince: 1993,
  },

  // 13: Dish Fine Burger Bistro
  13: {
    signatureDishes: ["The Dish burger", "Truffle fries", "Oreo milkshake"],
    insiderTip: "Order the weekly special burger from the chalkboard -- it rotates every Monday and is never on the printed menu.",
    bestFor: ["solo", "groups", "budget", "families"],
    vibe: ["lively", "modern", "local"],
    outdoorSeating: false,
    dogFriendly: false,
    wifiAvailable: true,
    laptopFriendly: false,
  },

  // 14: T-Anker Rooftop
  14: {
    signatureDishes: ["Tank Pilsner Urquell", "Smoked meat platter", "Nakládaný hermelín"],
    insiderTip: "Come 30 minutes before sunset for a free seat with a direct view of Prague Castle -- the terrace fills fast on warm evenings.",
    bestFor: ["couple", "groups", "first-time"],
    vibe: ["lively", "instagram", "touristy"],
    sunsetSpot: true,
    outdoorSeating: true,
    dogFriendly: false,
    wifiAvailable: false,
    laptopFriendly: false,
    openSince: 2013,
  },

  // 15: Maso a Kobliha
  15: {
    signatureDishes: ["Smoked brisket sandwich", "Pulled pork doughnut", "Coleslaw"],
    insiderTip: "They run out of brisket by 14:00 most days -- show up before noon or you'll be stuck with pulled pork only.",
    bestFor: ["solo", "budget", "locals"],
    vibe: ["gritty", "local", "authentic"],
    outdoorSeating: false,
    dogFriendly: false,
    wifiAvailable: false,
    laptopFriendly: false,
    openSince: 2016,
  },

  // 16: Kuchyn
  16: {
    signatureDishes: ["Roast pork knee", "Wild boar goulash", "Apple strudel"],
    insiderTip: "You pick your raw cut from the glass display and they roast it fresh -- the lamb shoulder is the best-kept secret.",
    bestFor: ["first-time", "families", "groups"],
    vibe: ["historic", "touristy", "lively"],
    outdoorSeating: false,
    dogFriendly: false,
    wifiAvailable: true,
    laptopFriendly: false,
    openSince: 2017,
  },

  // 17: Alcron
  17: {
    signatureDishes: ["Seafood degustation", "Dover sole meuniere", "Creme brulee"],
    insiderTip: "The small Art Deco dining room only seats 32 -- book at least a week ahead and request a banquette along the wall.",
    bestFor: ["couple", "business", "splurge"],
    vibe: ["elegant", "quiet", "historic"],
    dressCode: "smart",
    reservationUrl: "https://www.alcron.cz/en/reservation/",
    outdoorSeating: false,
    dogFriendly: false,
    wifiAvailable: true,
    laptopFriendly: false,
    openSince: 1932,
  },

  // 18: U Kroka
  18: {
    signatureDishes: ["Svickova na smetane", "Vepro-knedlo-zelo", "Medovnik"],
    insiderTip: "Regulars sit in the back room with the wooden booths -- tell the host you want the garden room for half the noise.",
    bestFor: ["locals", "couple", "budget"],
    vibe: ["authentic", "cozy", "local"],
    outdoorSeating: true,
    dogFriendly: true,
    wifiAvailable: false,
    laptopFriendly: false,
    openSince: 1999,
  },

  // ══════════════════════════════════════════════════════════════════
  // BARS
  // ══════════════════════════════════════════════════════════════════

  // 101: Hemingway Bar
  101: {
    signatureDishes: ["Hemingway Daiquiri", "Absinthe ritual service", "Old Cuban"],
    insiderTip: "Skip the menu and tell bartender Jarda your mood -- his off-menu creations routinely outshine the printed list.",
    bestFor: ["couple", "splurge", "business"],
    vibe: ["elegant", "quiet", "historic"],
    dressCode: "smart casual",
    reservationUrl: "https://www.hemingwaybar.cz/reservation",
    outdoorSeating: false,
    dogFriendly: false,
    wifiAvailable: false,
    laptopFriendly: false,
    openSince: 2011,
  },

  // 102: AnonymouS Bar
  102: {
    signatureDishes: ["Smoke Show Old Fashioned", "The Anonymous cocktail", "Espresso Martini"],
    insiderTip: "Ring the doorbell at the unmarked entrance on Michalska -- if they're full, they'll text you when a seat opens.",
    bestFor: ["couple", "groups"],
    vibe: ["underground", "cozy", "instagram"],
    dressCode: "smart casual",
    outdoorSeating: false,
    dogFriendly: false,
    wifiAvailable: false,
    laptopFriendly: false,
    openSince: 2014,
  },

  // 103: Black Angel's Bar
  103: {
    signatureDishes: ["Angel's Share", "Prohibition-era whiskey sour", "Corpse Reviver No. 2"],
    insiderTip: "Descend the staircase inside Hotel U Prince -- the basement speakeasy is invisible from street level.",
    bestFor: ["couple", "splurge"],
    vibe: ["underground", "elegant", "historic"],
    dressCode: "smart casual",
    outdoorSeating: false,
    dogFriendly: false,
    wifiAvailable: false,
    laptopFriendly: false,
    openSince: 2012,
  },

  // 104: Tretter's
  104: {
    signatureDishes: ["Dry Martini", "New York Sour", "Sidecar"],
    insiderTip: "Sit at the long marble bar if you're solo -- the bartenders have been here for over a decade and love to talk history.",
    bestFor: ["solo", "couple", "business"],
    vibe: ["elegant", "quiet", "historic"],
    dressCode: "smart casual",
    outdoorSeating: false,
    dogFriendly: false,
    wifiAvailable: false,
    laptopFriendly: false,
    openSince: 2003,
  },

  // 105: L'Fleur
  105: {
    signatureDishes: ["Floral gin fizz", "Lavender sour", "Seasonal botanical cocktail"],
    insiderTip: "The rooftop terrace on the third floor has only six seats -- claim one at opening (17:00) on summer evenings.",
    bestFor: ["couple", "groups", "splurge"],
    vibe: ["instagram", "modern", "elegant"],
    dressCode: "smart casual",
    sunsetSpot: true,
    outdoorSeating: true,
    dogFriendly: false,
    wifiAvailable: false,
    laptopFriendly: false,
    openSince: 2018,
  },

  // 106: Cloud 9
  106: {
    signatureDishes: ["Cloud 9 Signature", "Espresso Martini", "Czech sparkling wine by the glass"],
    insiderTip: "Go on a weekday after 21:00 -- the tourist crowds thin out and you get the full Castle-lit panorama to yourself.",
    bestFor: ["couple", "first-time", "splurge"],
    vibe: ["instagram", "modern", "romantic"],
    dressCode: "smart casual",
    sunsetSpot: true,
    outdoorSeating: true,
    dogFriendly: false,
    wifiAvailable: true,
    laptopFriendly: false,
    openSince: 2012,
  },

  // 107: Pivovarsky Dum
  107: {
    signatureDishes: ["Coffee lager", "Banana beer", "Classic Czech svetle 11"],
    insiderTip: "Order the beer tasting paddle with all seven house brews -- the cherry and nettle beers are oddly excellent.",
    bestFor: ["groups", "first-time", "budget"],
    vibe: ["lively", "local", "authentic"],
    outdoorSeating: true,
    dogFriendly: false,
    wifiAvailable: true,
    laptopFriendly: false,
    openSince: 1998,
  },

  // 108: U Fleku
  108: {
    signatureDishes: ["Flekovske tmave 13", "Vepro-knedlo-zelo", "Becherovka shot"],
    insiderTip: "Refuse the unrequested Becherovka shots from roaming waiters unless you want to pay 80 CZK each -- they add them to your bill automatically.",
    bestFor: ["first-time", "groups"],
    vibe: ["historic", "touristy", "lively"],
    avoidIfTouristy: true,
    outdoorSeating: true,
    dogFriendly: false,
    wifiAvailable: false,
    laptopFriendly: false,
    openSince: 1499,
  },

  // 109: U Medvidku
  109: {
    signatureDishes: ["X-Beer 33 (strongest Czech beer)", "Budvar original lager", "Pork knuckle"],
    insiderTip: "Try the X-Beer 33 -- at 12.6% ABV it is the strongest Czech lager ever brewed, but limit yourself to one.",
    bestFor: ["groups", "first-time", "locals"],
    vibe: ["historic", "authentic", "lively"],
    outdoorSeating: false,
    dogFriendly: false,
    wifiAvailable: false,
    laptopFriendly: false,
    openSince: 1466,
  },

  // 110: Vinograf
  110: {
    signatureDishes: ["Moravian Riesling flight", "Frankovka reserve", "Czech cheese board"],
    insiderTip: "Ask for the Moravian-only tasting flight -- three wines for 250 CZK that rival anything from Alsace.",
    bestFor: ["couple", "solo", "locals"],
    vibe: ["cozy", "quiet", "local"],
    outdoorSeating: false,
    dogFriendly: false,
    wifiAvailable: true,
    laptopFriendly: false,
    openSince: 2009,
  },

  // 111: BeerGeek Bar
  111: {
    signatureDishes: ["Rotating Czech craft IPA", "Matuska California Pale Ale", "Beer cheese dip"],
    insiderTip: "Tap 7 is always the rarest guest brew -- ask the bartender what just went on and you will get the freshest pour.",
    bestFor: ["solo", "locals", "groups"],
    vibe: ["local", "modern", "lively"],
    outdoorSeating: false,
    dogFriendly: true,
    wifiAvailable: true,
    laptopFriendly: true,
    openSince: 2014,
  },

  // 112: Bugsy's
  112: {
    signatureDishes: ["Bugsy's Martini", "Whiskey Smash", "Negroni"],
    insiderTip: "The cocktail menu is 400+ drinks -- tell your bartender two flavors you like and let them surprise you instead.",
    bestFor: ["couple", "business", "splurge"],
    vibe: ["elegant", "quiet", "historic"],
    dressCode: "smart casual",
    outdoorSeating: false,
    dogFriendly: false,
    wifiAvailable: false,
    laptopFriendly: false,
    openSince: 1996,
  },

  // 113: Vzorkovna
  113: {
    signatureDishes: ["Absinth cocktail", "Cheap draft Kozel", "Long Island Iced Tea"],
    insiderTip: "Enter through the unmarked courtyard door off Dlouha -- the labyrinth of rooms extends four floors including a hidden cinema.",
    bestFor: ["groups", "budget", "first-time"],
    vibe: ["underground", "gritty", "lively"],
    outdoorSeating: true,
    dogFriendly: false,
    wifiAvailable: false,
    laptopFriendly: false,
    openSince: 2002,
  },

  // 114: Bokovka
  114: {
    signatureDishes: ["Natural wine by the glass", "Orange wine flight", "Charcuterie plate"],
    insiderTip: "Thursday evenings the owner opens a rare bottle at cost price -- arrive by 18:00 to get a pour before it's gone.",
    bestFor: ["couple", "solo", "locals"],
    vibe: ["cozy", "local", "quiet"],
    outdoorSeating: false,
    dogFriendly: true,
    wifiAvailable: true,
    laptopFriendly: true,
    openSince: 2015,
  },

  // ══════════════════════════════════════════════════════════════════
  // SIGHTS
  // ══════════════════════════════════════════════════════════════════

  // 201: Prague Castle
  201: {
    insiderTip: "Enter through the eastern gate on U Daliborky street -- it's deserted even at peak hours while the main entrance has hour-long queues.",
    bestFor: ["first-time", "families", "solo"],
    vibe: ["historic", "touristy", "instagram"],
    visitDuration: "2-3 hours",
    sunsetSpot: true,
    outdoorSeating: false,
    dogFriendly: false,
    openSince: 870,
    avoidIfTouristy: true,
  },

  // 202: Charles Bridge
  202: {
    insiderTip: "Cross at 06:00 in summer to have the bridge nearly empty -- by 08:00 it is shoulder-to-shoulder with tour groups.",
    bestFor: ["first-time", "couple"],
    vibe: ["historic", "touristy", "romantic", "instagram"],
    visitDuration: "30-45 min",
    sunsetSpot: true,
    outdoorSeating: false,
    dogFriendly: true,
    openSince: 1402,
    avoidIfTouristy: true,
  },

  // 203: Old Town Square
  203: {
    insiderTip: "Stand on the meridian brass strip embedded in the pavement at noon -- it marks where the Marian Column once stood.",
    bestFor: ["first-time", "families"],
    vibe: ["historic", "touristy", "lively", "instagram"],
    visitDuration: "30-60 min",
    sunsetSpot: false,
    outdoorSeating: false,
    dogFriendly: true,
    avoidIfTouristy: true,
  },

  // 204: Astronomical Clock
  204: {
    insiderTip: "Watch the apostle procession from the side, not head-on -- the side angle lets you see all twelve figures clearly without craning your neck.",
    bestFor: ["first-time", "families"],
    vibe: ["historic", "touristy"],
    visitDuration: "15-20 min",
    outdoorSeating: false,
    dogFriendly: true,
    openSince: 1410,
    avoidIfTouristy: true,
  },

  // 205: St. Vitus Cathedral
  205: {
    insiderTip: "Visit the south tower separately for 150 CZK -- the 287-step climb rewards you with the best aerial view of the Castle complex.",
    bestFor: ["first-time", "solo"],
    vibe: ["historic", "quiet", "instagram"],
    visitDuration: "45-60 min",
    outdoorSeating: false,
    dogFriendly: false,
    openSince: 1344,
  },

  // 206: Church of Our Lady before Tyn
  206: {
    insiderTip: "The entrance is hidden through the Ungelt courtyard arcade -- look for the narrow passage between the souvenir shops.",
    bestFor: ["first-time", "solo"],
    vibe: ["historic", "quiet"],
    visitDuration: "20-30 min",
    outdoorSeating: false,
    dogFriendly: false,
    openSince: 1365,
  },

  // 207: Old Jewish Cemetery
  207: {
    insiderTip: "Buy the combined Jewish Museum ticket for all six sites -- the cemetery alone takes 20 minutes but the Pinkas Synagogue next door is the real emotional core.",
    bestFor: ["solo", "first-time"],
    vibe: ["historic", "quiet"],
    visitDuration: "1-2 hours",
    outdoorSeating: false,
    dogFriendly: false,
    openSince: 1439,
  },

  // 208: Wenceslas Square
  208: {
    insiderTip: "Walk the full 750-meter boulevard at night when the neon signs light up -- it feels like a completely different city than the daytime tourist corridor.",
    bestFor: ["first-time"],
    vibe: ["historic", "touristy", "lively"],
    visitDuration: "20-30 min",
    outdoorSeating: false,
    dogFriendly: true,
    avoidIfTouristy: true,
  },

  // 209: National Museum
  209: {
    insiderTip: "The renovated main building's grand staircase hall alone is worth the 250 CZK entry -- spend 10 minutes there even if you skip the exhibits.",
    bestFor: ["families", "first-time", "solo"],
    vibe: ["historic", "quiet"],
    visitDuration: "1.5-2.5 hours",
    outdoorSeating: false,
    dogFriendly: false,
    wifiAvailable: true,
    openSince: 1818,
  },

  // 210: Petrin Hill
  210: {
    insiderTip: "Take the funicular up and walk down through the orchards on the south slope -- almost no tourists take that path and you hit a hidden beer garden halfway down.",
    bestFor: ["couple", "families", "solo"],
    vibe: ["romantic", "quiet", "local"],
    visitDuration: "1.5-2 hours",
    sunsetSpot: true,
    outdoorSeating: true,
    dogFriendly: true,
  },

  // 211: Vysehrad
  211: {
    insiderTip: "Bring a bottle of wine to the ramparts at sunset -- locals spread blankets on the grass overlooking the Vltava and nobody bothers you.",
    bestFor: ["couple", "locals", "solo"],
    vibe: ["romantic", "quiet", "local", "historic"],
    visitDuration: "1-2 hours",
    sunsetSpot: true,
    outdoorSeating: true,
    dogFriendly: true,
    openSince: 950,
  },

  // 212: Strahov Monastery
  212: {
    signatureDishes: ["Sv. Norbert amber lager at the monastery brewery"],
    insiderTip: "After seeing the library halls, walk 100 meters to the Strahov Monastery Brewery for a St. Norbert amber lager brewed on-site since the 1600s.",
    bestFor: ["first-time", "solo", "couple"],
    vibe: ["historic", "quiet"],
    visitDuration: "1-1.5 hours",
    outdoorSeating: false,
    dogFriendly: false,
    openSince: 1143,
  },

  // 213: Dancing House
  213: {
    insiderTip: "The rooftop Glass Bar has a terrace with a 360-degree panorama -- skip the building tour and buy a drink upstairs for less than the gallery ticket.",
    bestFor: ["first-time"],
    vibe: ["modern", "instagram"],
    visitDuration: "15-30 min",
    outdoorSeating: true,
    dogFriendly: false,
    openSince: 1996,
  },

  // 214: Lennon Wall
  214: {
    insiderTip: "Bring your own spray paint marker -- the wall is repainted constantly and your message becomes part of a living artwork.",
    bestFor: ["first-time", "groups"],
    vibe: ["instagram", "touristy"],
    visitDuration: "10-15 min",
    outdoorSeating: false,
    dogFriendly: true,
    avoidIfTouristy: true,
  },

  // 215: Loreta
  215: {
    insiderTip: "Time your visit for the top of the hour to hear the 27-bell carillon play -- it chimes a Marian hymn every 60 minutes.",
    bestFor: ["solo", "first-time"],
    vibe: ["historic", "quiet"],
    visitDuration: "45-60 min",
    outdoorSeating: false,
    dogFriendly: false,
    openSince: 1626,
  },

  // 216: Letna Park
  216: {
    insiderTip: "The beer garden at the giant metronome has the single best vantage point of all Prague bridges lined up -- grab a Gambrinus and stay for golden hour.",
    bestFor: ["couple", "locals", "groups", "families"],
    vibe: ["local", "lively", "romantic"],
    visitDuration: "1-2 hours",
    sunsetSpot: true,
    outdoorSeating: true,
    dogFriendly: true,
  },

  // 217: Powder Tower
  217: {
    insiderTip: "Climb the 186 steps for a rooftop view that rivals Old Town Hall tower -- at half the price with a tenth of the queue.",
    bestFor: ["first-time", "solo"],
    vibe: ["historic"],
    visitDuration: "20-30 min",
    outdoorSeating: false,
    dogFriendly: false,
    openSince: 1475,
  },

  // 218: Naplavka
  218: {
    signatureDishes: ["Farmers market trdlo (Saturday mornings)", "Local craft beer from the boat bars"],
    insiderTip: "The Saturday farmers market (08:00-14:00) is when Naplavka is at its best -- arrive before 10:00 for the full selection of Moravian cheeses and pastries.",
    bestFor: ["couple", "locals", "families", "budget"],
    vibe: ["local", "lively", "authentic"],
    visitDuration: "1-2 hours",
    sunsetSpot: true,
    outdoorSeating: true,
    dogFriendly: true,
  },

  // ══════════════════════════════════════════════════════════════════
  // CAFES
  // ══════════════════════════════════════════════════════════════════

  // 301: Cafe Louvre
  301: {
    signatureDishes: ["Svickova", "Apple strudel", "Viennese coffee"],
    insiderTip: "Head straight to the billiards room in the back -- Einstein and Kafka played here, and you can still book a table for 100 CZK/hour.",
    bestFor: ["solo", "couple", "first-time"],
    vibe: ["historic", "elegant", "cozy"],
    outdoorSeating: false,
    dogFriendly: false,
    wifiAvailable: true,
    laptopFriendly: true,
    openSince: 1902,
  },

  // 302: Cafe Slavia
  302: {
    signatureDishes: ["Hot chocolate", "Palacinka with ice cream", "Espresso"],
    insiderTip: "Grab the corner window table facing the National Theatre -- it has the same river view as the painting 'Absinthe Drinker' on the wall behind you.",
    bestFor: ["solo", "couple", "first-time"],
    vibe: ["historic", "elegant", "romantic"],
    sunsetSpot: true,
    outdoorSeating: false,
    dogFriendly: false,
    wifiAvailable: true,
    laptopFriendly: true,
    openSince: 1884,
  },

  // 303: Cafe Imperial
  303: {
    signatureDishes: ["Imperial breakfast", "Beef tartare", "Eggs Royale"],
    insiderTip: "Look up -- the ceramic tile mosaics covering every surface were hand-restored and date to 1914; most people miss the ceiling details.",
    bestFor: ["first-time", "couple", "business"],
    vibe: ["elegant", "historic", "instagram"],
    dressCode: "smart casual",
    outdoorSeating: false,
    dogFriendly: false,
    wifiAvailable: true,
    laptopFriendly: false,
    openSince: 1914,
  },

  // 304: Grand Cafe Orient
  304: {
    signatureDishes: ["Cubist cake", "Turkish coffee", "Sachertorte"],
    insiderTip: "This is the only Cubist cafe in the world -- order the cubist-shaped cake and sit by the geometric window frames on the first floor.",
    bestFor: ["solo", "first-time"],
    vibe: ["historic", "quiet", "instagram"],
    outdoorSeating: false,
    dogFriendly: false,
    wifiAvailable: true,
    laptopFriendly: true,
    openSince: 1912,
  },

  // 305: Kavarna Obecni Dum
  305: {
    signatureDishes: ["Medovnik", "Viennese melange", "Cream puff"],
    insiderTip: "Ignore the overpriced restaurant upstairs -- the cafe on the ground floor has the same Art Nouveau interiors at a third of the price.",
    bestFor: ["first-time", "couple"],
    vibe: ["elegant", "historic", "instagram"],
    outdoorSeating: false,
    dogFriendly: false,
    wifiAvailable: true,
    laptopFriendly: false,
    openSince: 1912,
  },

  // 306: EMA Espresso Bar
  306: {
    signatureDishes: ["Flat white", "Banana bread", "Cold brew"],
    insiderTip: "The tiny upstairs loft has two tables with outlets -- it is the best hidden workspace in central Prague.",
    bestFor: ["solo", "locals", "budget"],
    vibe: ["modern", "local", "quiet"],
    outdoorSeating: false,
    dogFriendly: false,
    wifiAvailable: true,
    laptopFriendly: true,
    openSince: 2012,
  },

  // 307: Kavarna co hleda jmeno
  307: {
    signatureDishes: ["V60 pour-over", "Carrot cake", "Chemex single origin"],
    insiderTip: "Ask for the single-origin filter menu -- they roast in-house every Tuesday and the freshest batch is always mid-week.",
    bestFor: ["solo", "locals"],
    vibe: ["local", "cozy", "quiet"],
    outdoorSeating: false,
    dogFriendly: true,
    wifiAvailable: true,
    laptopFriendly: true,
    openSince: 2014,
  },

  // 308: Muj salek kavy
  308: {
    signatureDishes: ["Aeropress coffee", "Cinnamon roll", "Matcha latte"],
    insiderTip: "The baristas compete nationally -- ask whoever is on bar what they're dialing in today and you will get the best cup in the house.",
    bestFor: ["solo", "locals"],
    vibe: ["local", "modern", "quiet"],
    outdoorSeating: true,
    dogFriendly: true,
    wifiAvailable: true,
    laptopFriendly: true,
    openSince: 2013,
  },

  // ══════════════════════════════════════════════════════════════════
  // CLUBS
  // ══════════════════════════════════════════════════════════════════

  // 401: Roxy
  401: {
    insiderTip: "Check the NoD gallery upstairs before the main act -- there is usually a free experimental art or video installation running.",
    bestFor: ["locals", "groups", "solo"],
    vibe: ["underground", "gritty", "lively"],
    outdoorSeating: false,
    dogFriendly: false,
    wifiAvailable: false,
    laptopFriendly: false,
    openSince: 1993,
  },

  // 402: Cross Club
  402: {
    insiderTip: "Explore all three floors before settling -- the top-floor metal sculpture terrace is a steampunk world that most visitors never find.",
    bestFor: ["groups", "locals", "solo"],
    vibe: ["underground", "gritty", "instagram", "lively"],
    outdoorSeating: true,
    dogFriendly: false,
    wifiAvailable: false,
    laptopFriendly: false,
    openSince: 2003,
  },

  // 403: Lucerna Music Bar
  403: {
    insiderTip: "The 80s/90s retro party every Friday and Saturday from 21:00 is a Prague institution -- arrive by 22:00 or pay double at the door.",
    bestFor: ["groups", "first-time"],
    vibe: ["lively", "historic", "local"],
    outdoorSeating: false,
    dogFriendly: false,
    wifiAvailable: false,
    laptopFriendly: false,
    openSince: 1920,
  },

  // 404: Karlovy Lazne
  404: {
    insiderTip: "Five floors each play a different genre -- head straight to the top floor (chill-out) to avoid the ground-floor tourist crush.",
    bestFor: ["first-time", "groups"],
    vibe: ["touristy", "lively"],
    avoidIfTouristy: true,
    outdoorSeating: false,
    dogFriendly: false,
    wifiAvailable: false,
    laptopFriendly: false,
    openSince: 1999,
  },

  // 405: Palac Akropolis
  405: {
    insiderTip: "The small downstairs stage hosts world music and Balkan brass bands that never appear in mainstream listings -- check their Facebook for the weekly lineup.",
    bestFor: ["locals", "solo", "groups"],
    vibe: ["underground", "authentic", "lively"],
    outdoorSeating: false,
    dogFriendly: false,
    wifiAvailable: false,
    laptopFriendly: false,
    openSince: 1991,
  },

  // 406: SaSaZu
  406: {
    signatureDishes: ["Pad Thai from the in-house kitchen", "Lychee Martini"],
    insiderTip: "Book the Asian restaurant first and tell the host you have club tickets -- they will seat you near the back entrance so you skip the main queue entirely.",
    bestFor: ["groups", "splurge"],
    vibe: ["modern", "lively", "elegant"],
    dressCode: "smart casual",
    outdoorSeating: false,
    dogFriendly: false,
    wifiAvailable: false,
    laptopFriendly: false,
    openSince: 2009,
  },
};
