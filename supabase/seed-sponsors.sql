-- Sponsor seed data — 5+ sponsors per niche

insert into sponsors (name, industry, website, typical_budget, description) values
-- Tech
('Apple','Tech','apple.com','$50,000 - $500,000','Consumer electronics and software giant. Frequently sponsors tech reviewers and creators.'),
('Samsung','Tech','samsung.com','$20,000 - $200,000','Electronics brand looking for tech and lifestyle creators for product launches.'),
('Nvidia','Tech','nvidia.com','$10,000 - $100,000','GPU and AI company. Sponsors tech channels covering gaming hardware and AI.'),
('Squarespace','Tech','squarespace.com','$2,000 - $15,000','Website builder. Top sponsor across tech, business, and creator niches.'),
('NordVPN','Tech','nordvpn.com','$3,000 - $30,000','VPN service. One of the most active sponsors across YouTube and podcasts.'),
('Surfshark','Tech','surfshark.com','$2,000 - $20,000','VPN and cybersecurity. Actively sponsors tech and gaming creators.'),
('Notion','Tech','notion.so','$2,000 - $25,000','Productivity app. Sponsors productivity, tech, and education channels.'),
('Hostinger','Tech','hostinger.com','$1,000 - $10,000','Web hosting. Frequently sponsors tech and business creators.'),

-- Gaming
('Razer','Gaming','razer.com','$5,000 - $50,000','Gaming peripherals brand. Major sponsor of gaming streamers and YouTubers.'),
('Corsair','Gaming','corsair.com','$3,000 - $30,000','PC components and gaming gear. Sponsors mid to large gaming creators.'),
('SteelSeries','Gaming','steelseries.com','$2,000 - $20,000','Gaming peripherals. Active in esports and gaming content.'),
('MSI','Gaming','msi.com','$5,000 - $80,000','Gaming laptops and components. Sponsors hardware review and gaming channels.'),
('ASUS ROG','Gaming','asus.com','$5,000 - $100,000','Republic of Gamers brand. Premium gaming hardware sponsor.'),
('G Fuel','Gaming','gfuel.com','$1,000 - $15,000','Energy drink for gamers. Massive sponsor across gaming and esports.'),
('GreenMan Gaming','Gaming','greenmangaming.com','$500 - $5,000','Digital game store. Sponsors gaming content creators with affiliate deals.'),

-- Finance
('Coinbase','Finance','coinbase.com','$10,000 - $100,000','Crypto exchange. Sponsors finance, crypto, and investing creators.'),
('Robinhood','Finance','robinhood.com','$5,000 - $50,000','Stock trading app. Sponsors personal finance and investing channels.'),
('NerdWallet','Finance','nerdwallet.com','$3,000 - $30,000','Financial comparison site. Sponsors finance and lifestyle creators.'),
('Masterworks','Finance','masterworks.com','$2,000 - $20,000','Art investment platform. Active sponsor on finance YouTube channels.'),
('Public.com','Finance','public.com','$2,000 - $15,000','Investing platform. Sponsors finance and business creators.'),
('Acorns','Finance','acorns.com','$1,000 - $10,000','Micro-investing app. Sponsors personal finance and lifestyle channels.'),
('Aura','Finance','aura.com','$2,000 - $20,000','Identity theft protection. Sponsors tech, finance, and family creators.'),

-- Beauty
('Sephora','Beauty','sephora.com','$5,000 - $100,000','Beauty retailer. Major sponsor of beauty and lifestyle creators.'),
('Ulta Beauty','Beauty','ulta.com','$3,000 - $50,000','Beauty retail chain. Sponsors beauty and lifestyle content.'),
('Glossier','Beauty','glossier.com','$2,000 - $30,000','DTC beauty brand. Sponsors authentic beauty and lifestyle creators.'),
('Fenty Beauty','Beauty','fentybeauty.com','$10,000 - $200,000','Rihanna''s beauty brand. Major beauty sponsor for inclusive creators.'),
('NARS','Beauty','narscosmetics.com','$3,000 - $40,000','Luxury cosmetics brand. Sponsors premium beauty content creators.'),
('Charlotte Tilbury','Beauty','charlottetilbury.com','$5,000 - $75,000','Luxury beauty brand. Sponsors high-end beauty and lifestyle creators.'),

-- Food
('HelloFresh','Food','hellofresh.com','$3,000 - $30,000','Meal kit delivery. Top food and lifestyle sponsor across all platforms.'),
('Blue Apron','Food','blueapron.com','$2,000 - $20,000','Meal kit delivery. Sponsors cooking, food, and lifestyle creators.'),
('Factor Meals','Food','factormeals.com','$2,000 - $25,000','Prepared meal delivery. Sponsors fitness, food, and lifestyle creators.'),
('DoorDash','Food','doordash.com','$5,000 - $50,000','Food delivery app. Sponsors food, lifestyle, and entertainment creators.'),
('Thrive Market','Food','thrivemarket.com','$2,000 - $20,000','Organic grocery delivery. Sponsors health, food, and wellness creators.'),
('Magic Spoon','Food','magicspoon.com','$1,000 - $10,000','Healthy cereal brand. Popular sponsor on health and lifestyle channels.'),

-- Fitness
('Nike','Fitness','nike.com','$20,000 - $500,000','Global sportswear brand. Major sponsor for fitness and athlete creators.'),
('Gymshark','Fitness','gymshark.com','$3,000 - $50,000','Fitness apparel. Sponsors gym and fitness creators heavily.'),
('Peloton','Fitness','onepeloton.com','$5,000 - $75,000','Connected fitness equipment. Sponsors fitness and lifestyle creators.'),
('MyProtein','Fitness','myprotein.com','$1,000 - $15,000','Sports nutrition. Active sponsor on fitness YouTube and Instagram.'),
('Gainful','Fitness','gainful.com','$1,000 - $10,000','Personalized protein brand. Sponsors fitness and wellness creators.'),
('Eight Sleep','Fitness','eightsleep.com','$3,000 - $30,000','Smart mattress for performance. Sponsors fitness and biohacking creators.'),

-- Fashion
('ASOS','Fashion','asos.com','$3,000 - $30,000','Online fashion retailer. Sponsors fashion and lifestyle creators.'),
('Revolve','Fashion','revolve.com','$5,000 - $100,000','Premium fashion brand. Major influencer marketing spender.'),
('Shein','Fashion','shein.com','$500 - $10,000','Fast fashion giant. Sponsors fashion creators at all follower levels.'),
('Quay Australia','Fashion','quayaustralia.com','$1,000 - $15,000','Sunglasses brand. Sponsors fashion and lifestyle creators.'),
('ThredUp','Fashion','thredup.com','$1,000 - $10,000','Online thrift store. Sponsors sustainable fashion creators.'),
('Petal & Pup','Fashion','petalandpup.com','$500 - $8,000','Women''s fashion. Sponsors mid-tier fashion and lifestyle creators.'),

-- Lifestyle
('Amazon','Lifestyle','amazon.com','$5,000 - $200,000','Everything. Amazon Associates and brand deals across all niches.'),
('Airbnb','Lifestyle','airbnb.com','$5,000 - $100,000','Travel and accommodation. Sponsors travel and lifestyle creators.'),
('Canva','Lifestyle','canva.com','$2,000 - $20,000','Design platform. Sponsors creators across all niches.'),
('BetterHelp','Lifestyle','betterhelp.com','$3,000 - $30,000','Online therapy. Sponsors podcast and lifestyle creators.'),
('Ritual','Lifestyle','ritual.com','$1,000 - $15,000','Vitamins and supplements. Sponsors health and lifestyle creators.'),
('Purple','Lifestyle','purple.com','$3,000 - $30,000','Mattress brand. Sponsors home, lifestyle, and wellness creators.'),

-- Travel
('Booking.com','Travel','booking.com','$5,000 - $100,000','Travel platform. Major sponsor of travel creators worldwide.'),
('Expedia','Travel','expedia.com','$5,000 - $75,000','Online travel agency. Sponsors travel and lifestyle creators.'),
('Away','Travel','awaytravel.com','$2,000 - $25,000','Premium luggage brand. Sponsors travel and lifestyle content.'),
('VisaHQ','Travel','visahq.com','$1,000 - $10,000','Visa service. Sponsors travel creators.'),
('World Nomads','Travel','worldnomads.com','$1,000 - $10,000','Travel insurance. Sponsors adventure and travel creators.'),

-- Education
('Coursera','Education','coursera.org','$2,000 - $20,000','Online learning platform. Sponsors education and career content.'),
('Skillshare','Education','skillshare.com','$2,000 - $25,000','Creative learning platform. Major sponsor of creator economy content.'),
('Brilliant','Education','brilliant.org','$2,000 - $30,000','STEM learning app. Top sponsor on tech, math, and science channels.'),
('Grammarly','Education','grammarly.com','$3,000 - $30,000','Writing AI tool. Sponsors creators across nearly all niches.'),
('MasterClass','Education','masterclass.com','$5,000 - $75,000','Premium education. Sponsors high-quality creator channels.'),
('Duolingo','Education','duolingo.com','$2,000 - $20,000','Language learning app. Sponsors education and lifestyle creators.');
