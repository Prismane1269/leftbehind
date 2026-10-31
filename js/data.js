/* ==========================================================================
   ABANDONED BUT NOT FORGOTTEN — the catalogue
   Every object carries its own sources: this is a storytelling project built
   on NASA data, so each fact is traceable. Coordinates are the documented
   landing / final-rest coordinates (planetographic, east-positive).
   ========================================================================== */
(function () {
  'use strict';
  const LB = (window.LB = window.LB || {});

  const NASA = {
    apollo: 'https://www.nasa.gov/the-apollo-program/',
    apollo11: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1969-059C',
    surveyor1: 'https://science.nasa.gov/mission/surveyor-1/',
    surveyor3: 'https://science.nasa.gov/mission/surveyor-3/',
    viking: 'https://science.nasa.gov/mission/viking/',
    pathfinder: 'https://science.nasa.gov/mission/mars-pathfinder/',
    spirit: 'https://science.nasa.gov/mission/mer-spirit/',
    opportunity: 'https://science.nasa.gov/mission/mer-opportunity/',
    phoenix: 'https://science.nasa.gov/mission/phoenix/',
    insight: 'https://science.nasa.gov/mission/insight/',
    curiosity: 'https://science.nasa.gov/mission/msl-curiosity/',
    perseverance: 'https://science.nasa.gov/mission/mars-2020-perseverance/',
    ingenuity: 'https://mars.nasa.gov/technology/helicopter/',
    voyager: 'https://science.nasa.gov/mission/voyager/',
    moon: 'https://science.nasa.gov/moon/',
    mars: 'https://science.nasa.gov/mars/',
    factMars: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html'
  };

  /* status → label + tag class */
  const STATUS = {
    silent: { label: 'Silent — no signal since', short: 'silent', tag: 'tag--silent', color: '#9fb0c8' },
    retired: { label: 'Retired — power lost', short: 'out of power', tag: 'tag--retired', color: '#c98f6a' },
    active: { label: 'Still working', short: 'working now', tag: 'tag--active', color: '#5af0b4' },
    travelling: { label: 'Still travelling', short: 'still flying', tag: 'tag--travelling', color: '#c4b5fd' }
  };

  /* ------------------------------------------------------------------ data */
  const OBJECTS = [
    /* ============================================================= THE MOON */
    {
      id: 'surveyor1', name: 'Surveyor 1', short: 'Surveyor 1',
      type: 'Robotic lander', body: 'moon', model: 'surveyor',
      lat: 2.45, lon: -43.22, site: 'Oceanus Procellarum (Ocean of Storms)',
      landed: '2 June 1966', landedYear: 1966, lastContact: '7 January 1967', lastYear: 1967,
      status: 'silent', mass: '292 kg', power: 'Solar panels + battery',
      headline: 'The first American spacecraft to land softly on the Moon.',
      story: 'Before astronauts could walk on the Moon, a robot had to prove the ground was solid. Surveyor 1 landed gently in the Ocean of Storms and sent back 11,237 pictures. It survived a lunar night (two weeks of darkness and −170 °C) and woke up again, which no one expected.',
      science: ['First close-up photographs of the lunar surface', 'Showed the soil could hold the weight of a lander', 'Proved a soft landing was possible before Apollo'],
      leftBehind: ['The lander itself, standing on three legs', 'Its solar panel, still pointed at the Sun'],
      legacy: 'Every crewed landing that followed stood on the confidence Surveyor 1 gave engineers.',
      stats: [['Pictures returned', '11,237'], ['Mass', '292 kg'], ['Operated for', '~6 months']],
      sources: [{ label: 'NASA — Surveyor 1', url: NASA.surveyor1 }, { label: 'NASA — Moon', url: NASA.moon }]
    },
    {
      id: 'surveyor3', name: 'Surveyor 3', short: 'Surveyor 3',
      type: 'Robotic lander', body: 'moon', model: 'surveyor',
      lat: 2.99, lon: -23.34, site: 'Oceanus Procellarum, near Apollo 12',
      landed: '20 April 1967', landedYear: 1967, lastContact: '4 May 1967', lastYear: 1967,
      status: 'silent', mass: '302 kg', power: 'Solar panels + battery',
      headline: 'The only spacecraft on the Moon that humans have walked up to and touched.',
      story: 'Two and a half years after Surveyor 3 fell silent, the crew of Apollo 12 landed 163 metres away, walked over, and cut pieces off it to bring home. Scientists wanted to know what 31 months of Moon weather does to a machine — and what they found inside its camera changed what we knew about life surviving in space.',
      science: ['First spacecraft to be visited and sampled by humans', 'Returned parts showed how materials survive on the Moon', 'Bacteria found inside its camera had survived 31 months of lunar conditions'],
      leftBehind: ['The lander body, its camera cut open by Apollo 12 astronauts', 'A crater it dug with its own landing rockets'],
      legacy: 'The parts Apollo 12 brought home are still studied today as the only long-duration Moon hardware samples ever returned.',
      stats: [['Walked to by', 'Apollo 12 crew'], ['Distance from Apollo 12', '163 m'], ['Parts returned', 'Yes — to Earth']],
      sources: [{ label: 'NASA — Surveyor 3', url: NASA.surveyor3 }, { label: 'NASA — Apollo', url: NASA.apollo }]
    },
    {
      id: 'apollo11lm', name: 'Apollo 11 “Eagle” descent stage', short: 'Apollo 11 LM “Eagle”',
      type: 'Crewed lander stage', body: 'moon', model: 'lem',
      lat: 0.6741, lon: 23.4730, site: 'Tranquility Base, Mare Tranquillitatis',
      landed: '20 July 1969', landedYear: 1969, lastContact: 'Left 20 July 1969', lastYear: 1969,
      status: 'silent', mass: '~2,000 kg (descent stage)', power: 'Batteries — drained long ago',
      headline: 'The base of the first spacecraft to land humans on the Moon — and it is still there.',
      story: 'When Neil Armstrong and Buzz Aldrin left the Moon, they flew home in the top half of their lander, the ascent stage. The bottom half — legs, engine, ladders, a gold foil skirt — was left behind at Tranquility Base. A plaque on one of its legs reads: “We came in peace for all mankind.”',
      science: ['First human footprints and samples from another world (21.5 kg)', 'A laser reflector it carried still bounces light back to Earth today', 'Its seismometer recorded Moon quakes for weeks'],
      leftBehind: ['Descent stage with four legs', 'A retroreflector still used by observatories', 'A plaque, a flag, footprints, and camera gear'],
      legacy: 'The retroreflector on this descent stage is still in use — an experiment from 1969 that never ends.',
      stats: [['Landing site', '0.6741°N 23.4730°E'], ['Time on surface', '21 h 36 m'], ['Left here since', '1969']],
      sources: [{ label: 'NASA — Apollo 11 (NSSDC)', url: NASA.apollo11 }, { label: 'NASA — Apollo Program', url: NASA.apollo }]
    },
    {
      id: 'apollo12lm', name: 'Apollo 12 “Intrepid” descent stage', short: 'Apollo 12 LM “Intrepid”',
      type: 'Crewed lander stage', body: 'moon', model: 'lem',
      lat: 3.0124, lon: -23.4216, site: 'Oceanus Procellarum, Surveyor Crater',
      landed: '19 November 1969', landedYear: 1969, lastContact: 'Left 20 November 1969', lastYear: 1969,
      status: 'silent', mass: '~2,000 kg (descent stage)', power: 'Batteries — drained long ago',
      headline: 'The second landing, and the one that walked over to an old robot.',
      story: 'Apollo 12 proved NASA could land exactly where it aimed — close enough to an old Surveyor robot to walk to it. Its crew also brought back pieces of Surveyor 3, answering a question engineers had been wondering for years: what does the Moon do to a machine left behind?',
      science: ['Precision landing next to a target already on the Moon', 'Returned pieces of Surveyor 3 for study on Earth', 'Deployed a seismometer and a solar-powered experiment'],
      leftBehind: ['Descent stage', 'A solar-powered experiment station', 'The leg it left standing in the Moon dust'],
      legacy: 'Its precision landing proved the navigation that later missions relied on.',
      stats: [['Landing site', '3.0124°S 23.4216°W'], ['Landing accuracy', '≈163 m from Surveyor 3'], ['Left here since', '1969']],
      sources: [{ label: 'NASA — Surveyor 3', url: NASA.surveyor3 }, { label: 'NASA — Apollo Program', url: NASA.apollo }]
    },
    {
      id: 'apollo15lm', name: 'Apollo 15 “Falcon” descent stage', short: 'Apollo 15 LM + LRV-1',
      type: 'Crewed lander stage + vehicle', body: 'moon', model: 'lemlrv',
      lat: 26.1322, lon: 3.6339, site: 'Hadley–Apennine, near Hadley Rille',
      landed: '30 July 1971', landedYear: 1971, lastContact: 'Left 2 August 1971', lastYear: 1971,
      status: 'silent', mass: '~2,000 kg + 210 kg rover', power: 'Batteries — drained long ago',
      headline: 'The first mission with a car on the Moon.',
      story: 'Apollo 15 brought the first Lunar Roving Vehicle — a battery-powered car with wire mesh wheels and folding seats. It let astronauts travel kilometres instead of metres, driving along the edge of a giant canyon called Hadley Rille.',
      science: ['First lunar driving: 27.8 km on the first rover', 'Returned a 4.5-billion-year-old rock nicknamed the “Genesis Rock”', 'Explored the edge of a 1.5 km-wide canyon'],
      leftBehind: ['Descent stage', 'LRV-1 rover, parked on the surface', 'A small satellite released from the spacecraft'],
      legacy: 'Three rovers now sleep on the Moon — the ancestors of every rover driving on Mars today.',
      stats: [['Rover distance driven', '27.8 km'], ['Sample mass returned', '77 kg'], ['Left here since', '1971']],
      sources: [{ label: 'NASA — Apollo Program', url: NASA.apollo }, { label: 'NASA — Moon', url: NASA.moon }]
    },
    {
      id: 'apollo17lm', name: 'Apollo 17 “Challenger” descent stage', short: 'Apollo 17 LM + LRV-3',
      type: 'Crewed lander stage + vehicle', body: 'moon', model: 'lem',
      lat: 20.1908, lon: 30.7717, site: 'Taurus–Littrow, Vallis Schröteri',
      landed: '11 December 1972', landedYear: 1972, lastContact: 'Left 14 December 1972', lastYear: 1972,
      status: 'silent', mass: '~2,000 kg + 210 kg rover', power: 'Batteries — drained long ago',
      headline: 'The last spacecraft humans left on the Moon — and the last wheel tracks.',
      story: 'In December 1972 Eugene Cernan and Harrison Schmitt left the Moon, and no human has been back since. Their rover LRV-3 set a lunar speed record of about 18 km/h and left tracks that are still there, undisturbed, because the Moon has no wind or rain to erase them.',
      science: ['Last human samples from the Moon (111 kg)', 'A geologist’s eye: Schmitt was the first scientist-astronaut', 'Longest driving mission: 35.7 km'],
      leftBehind: ['Descent stage', 'LRV-3, the last car on the Moon', 'A plaque and the record of the last footprints'],
      legacy: 'Its tracks are a time capsule: the Moon keeps them exactly as they were left, for millions of years.',
      stats: [['Rover distance driven', '35.7 km'], ['Top speed', '≈18 km/h'], ['Left here since', '1972']],
      sources: [{ label: 'NASA — Apollo Program', url: NASA.apollo }, { label: 'NASA — Moon', url: NASA.moon }]
    },

    /* =============================================================== MARS */
    {
      id: 'viking1', name: 'Viking 1 lander', short: 'Viking 1',
      type: 'Robotic lander', body: 'mars', model: 'viking',
      lat: 22.48, lon: -49.97, site: 'Chryse Planitia',
      landed: '20 July 1976', landedYear: 1976, lastContact: '11 November 1982', lastYear: 1982,
      status: 'silent', mass: '572 kg', power: 'Radioisotope thermal generators',
      headline: 'Seven years after Apollo 11, NASA landed on Mars on the same date.',
      story: 'Viking 1 sent the first picture ever taken from the surface of Mars — and it was of its own foot. Its cameras and robotic arm then looked for signs of life in the Martian soil. It kept working for six years before a command error broke its antenna, and it has been silent ever since.',
      science: ['First photographs from the surface of Mars', 'First search for life in Martian soil', 'Measured the Martian atmosphere and weather for years'],
      leftBehind: ['The lander, still sitting on its three legs', 'A robotic arm holding soil scoop', 'A nuclear power source that has since cooled'],
      legacy: 'Everything NASA knows about landing on Mars started with Viking’s three legs.',
      stats: [['Site', '22.48°N 49.97°W'], ['Worked for', '6 years 3 months'], ['Image of the surface', 'The very first']],
      sources: [{ label: 'NASA — Viking', url: NASA.viking }, { label: 'NASA — Mars', url: NASA.mars }]
    },
    {
      id: 'viking2', name: 'Viking 2 lander', short: 'Viking 2',
      type: 'Robotic lander', body: 'mars', model: 'viking',
      lat: 47.97, lon: 134.26, site: 'Utopia Planitia',
      landed: '3 September 1976', landedYear: 1976, lastContact: '11 April 1980', lastYear: 1980,
      status: 'silent', mass: '572 kg', power: 'Radioisotope thermal generators',
      headline: 'The lander that watched Martian winter bury its own solar instruments.',
      story: 'Viking 2 landed further north, where Martian winters are brutal. It watched frost and dust build up, sent back colour pictures of red soil and a pinkish sky, and then lost power as its batteries failed in the cold.',
      science: ['Second working weather station on Mars', 'Images showing frost and changing seasons', 'Confirmed Mars has a very thin, dusty atmosphere'],
      leftBehind: ['The lander on its legs', 'An arm that dug trenches in the soil'],
      legacy: 'Two Vikings gave scientists the first long record of Mars weather — the baseline for every mission since.',
      stats: [['Site', '47.97°N 134.26°E'], ['Worked for', '3 years 7 months'], ['Landing date', '3 Sept 1976']],
      sources: [{ label: 'NASA — Viking', url: NASA.viking }, { label: 'NASA — Mars', url: NASA.mars }]
    },
    {
      id: 'pathfinder', name: 'Mars Pathfinder + Sojourner', short: 'Pathfinder + Sojourner',
      type: 'Lander + first rover', body: 'mars', model: 'pathfinder',
      lat: 19.13, lon: -33.22, site: 'Ares Vallis, an ancient flood plain',
      landed: '4 July 1997', landedYear: 1997, lastContact: '27 September 1997', lastYear: 1997,
      status: 'silent', mass: '264 kg lander + 10.5 kg rover', power: 'Solar panels',
      headline: 'The mission that bounced onto Mars inside airbags — and delivered the first rover.',
      story: 'Pathfinder hit Mars at 20 m/s wrapped in airbags, bounced a dozen times, and then opened like a flower. Out drove Sojourner, a microwave-oven-sized rover that became the first wheels on Mars.',
      science: ['First rover on Mars: Sojourner drove about 100 m', 'Studied rocks from a huge ancient flood', 'Proved airbag landings and rover operations work'],
      leftBehind: ['The lander and its unfolded petals', 'Sojourner rover, parked beside it'],
      legacy: 'Sojourner was the blueprint for every Mars rover since, including the ones still driving today.',
      stats: [['Rover distance', '≈100 m'], ['Bounces on landing', '≈15'], ['Rover mass', '10.5 kg']],
      sources: [{ label: 'NASA — Mars Pathfinder', url: NASA.pathfinder }, { label: 'NASA — Mars', url: NASA.mars }]
    },
    {
      id: 'spirit', name: 'Spirit (MER-A)', short: 'Spirit',
      type: 'Rover', body: 'mars', model: 'mer',
      lat: -14.57, lon: 175.47, site: 'Gusev Crater, a possible ancient lake bed',
      landed: '4 January 2004', landedYear: 2004, lastContact: '22 March 2010', lastYear: 2010,
      status: 'silent', mass: '185 kg', power: 'Solar panels',
      headline: 'Designed for 90 days. It worked for over six years.',
      story: 'Spirit found evidence that Mars once had water — and a lot of it. Then one day its wheels broke through the crust into soft sand and it could not climb out. It spent its last winter parked, waiting for sunlight to charge its batteries, and never phoned home again.',
      science: ['Found minerals that form only in water', 'Climbed mountains and survived six Martian winters', 'Drove 7.73 km on a 90-day warranty'],
      leftBehind: ['The rover, sitting in the sand at a spot called Troy', 'Wheel tracks crossing the crater floor'],
      legacy: 'Its twin Opportunity kept going after Spirit went quiet, and set a record that still stands.',
      stats: [['Distance driven', '7.73 km'], ['Designed for', '90 sols'], ['Actually worked', '6 years']],
      sources: [{ label: 'NASA — Spirit', url: NASA.spirit }, { label: 'NASA — Mars', url: NASA.mars }]
    },
    {
      id: 'opportunity', name: 'Opportunity (MER-B)', short: 'Opportunity',
      type: 'Rover', body: 'mars', model: 'mer',
      lat: -1.95, lon: -5.53, site: 'Perseverance Valley, Meridiani Planum',
      landed: '25 January 2004', landedYear: 2004, lastContact: '10 June 2018', lastYear: 2018,
      status: 'silent', mass: '185 kg', power: 'Solar panels',
      headline: 'The marathon champion of another planet.',
      story: 'Opportunity landed in a crater and kept driving for 14 years and 46 days, covering 45.16 km — more than a marathon. It found rocks that formed in water, and it finally died inside a planet-wide dust storm that turned the sky black for months. Its last message was, in effect: my battery is low and it is getting dark.',
      science: ['Drove 45.16 km — the farthest on any other world', 'Found proof that acidic water once soaked this ground', 'Worked for 14 years on a 90-day mission'],
      leftBehind: ['The rover, parked in Perseverance Valley', 'Half a marathon of wheel tracks behind it'],
      legacy: '“Oppy” is why NASA now plans rovers for years, not weeks — and why a Mars marathon is even a thing.',
      stats: [['Distance driven', '45.16 km'], ['Days worked', '5,352'], ['Warranty', '90 days']],
      sources: [{ label: 'NASA — Opportunity', url: NASA.opportunity }, { label: 'NASA — Mars', url: NASA.mars }]
    },
    {
      id: 'phoenix', name: 'Phoenix', short: 'Phoenix',
      type: 'Robotic lander', body: 'mars', model: 'phoenix',
      lat: 68.22, lon: -125.70, site: 'Vastitas Borealis, near the north pole',
      landed: '25 May 2008', landedYear: 2008, lastContact: '2 November 2008', lastYear: 2008,
      status: 'silent', mass: '350 kg', power: 'Solar panels',
      headline: 'The first spacecraft to dig up and taste water ice on Mars.',
      story: 'Phoenix landed near the Martian north pole and dug into the ground with a robotic arm. Just under the surface: water ice. Then winter arrived, the Sun sank, and the lander froze — buried under carbon-dioxide frost. NASA still listens for it every year when the pole warms up, just in case.',
      science: ['First spacecraft to touch Martian water ice', 'Watched snow fall from Martian clouds', 'Found perchlorate salts in the soil'],
      leftBehind: ['The lander, frozen and probably dust-covered', 'A trench it dug that is still there'],
      legacy: 'Phoenix’s ice discovery guided the search for habitable places on Mars — and its name was given to the next polar mission.',
      stats: [['Site', '68.22°N 125.7°W'], ['Worked for', '≈5 months'], ['Ice found', 'A few cm down']],
      sources: [{ label: 'NASA — Phoenix', url: NASA.phoenix }, { label: 'NASA — Mars', url: NASA.mars }]
    },
    {
      id: 'insight', name: 'InSight', short: 'InSight',
      type: 'Geophysical lander', body: 'mars', model: 'insight',
      lat: 4.50, lon: 135.90, site: 'Elysium Planitia, a flat plain near the equator',
      landed: '26 November 2018', landedYear: 2018, lastContact: '15 December 2022', lastYear: 2022,
      status: 'retired', mass: '358 kg', power: 'Solar panels (dusted over)',
      headline: 'The lander that listened to Mars and counted 1,319 marsquakes.',
      story: 'InSight did not drive anywhere. It sat still and listened — with the most sensitive seismometer ever sent to another planet. It felt Mars quakes, meteorite impacts, and the rumble of the planet beneath its feet. Then dust slowly covered its solar panels until it ran out of power.',
      science: ['Detected 1,319 marsquakes and meteoroid impacts', 'Mapped the size of Mars’s core, mantle and crust', 'Its last image showed sunrise on a dusty plain'],
      leftBehind: ['The lander in “dead bus” mode', 'A seismometer and a heat probe on the surface', 'A dusty solar array'],
      legacy: 'InSight gave humanity the first X-ray of a planet’s inside — Mars is layered like Earth, but smaller and colder.',
      stats: [['Marsquakes found', '1,319'], ['Last contact', '15 Dec 2022'], ['Mission length', '4 years']],
      sources: [{ label: 'NASA — InSight', url: NASA.insight }, { label: 'NASA — Mars', url: NASA.mars }]
    },
    {
      id: 'ingenuity', name: 'Ingenuity', short: 'Ingenuity “Ginny”',
      type: 'Helicopter (technology demo)', body: 'mars', model: 'ingenuity',
      lat: 18.44, lon: 77.45, site: 'Valinor Hills, Jezero Crater',
      firstFlight: '19 April 2021', landed: 'Deployed 3 April 2021', landedYear: 2021,
      lastContact: '16 April 2024', lastYear: 2024,
      status: 'retired', mass: '1.8 kg', power: 'Solar panel + batteries',
      headline: 'The first aircraft to fly on another planet. It was built for five flights.',
      story: 'All Ingenuity had to do was prove that a helicopter could fly in air thinner than 1% of Earth’s. It flew 72 times instead — 17 km across Jezero Crater, scouting the way for the Perseverance rover. On its last flight a rotor blade broke, and now it sits on a hillside, still testing its solar panel while it waits.',
      science: ['First powered flight on another world — 19 April 2021', 'Flew 72 times, 17.2 km, 128 minutes in the air', 'Proved aerial scouting works on Mars'],
      leftBehind: ['The helicopter, upright at Valinor Hills', 'A software patch that keeps it collecting data'],
      legacy: 'Ingenuity’s flight log is now an engineering textbook for the next flying machines on Mars and Titan.',
      stats: [['Flights', '72'], ['Distance flown', '17.2 km'], ['Planned flights', '5']],
      sources: [{ label: 'NASA — Ingenuity', url: NASA.ingenuity }, { label: 'NASA — Perseverance', url: NASA.perseverance }]
    },
    {
      id: 'curiosity', name: 'Curiosity', short: 'Curiosity',
      type: 'Car-sized rover', body: 'mars', model: 'msl',
      lat: -4.59, lon: 137.44, site: 'Gale Crater, beneath Mount Sharp',
      landed: '6 August 2012', landedYear: 2012, lastContact: 'Still transmitting today', lastYear: 2026,
      status: 'active', mass: '899 kg', power: 'Radioisotope power source',
      headline: 'Still working after more than a decade — because it does not need sunlight.',
      story: 'Curiosity landed using a rocket-powered “sky crane”, and it runs on nuclear power, so dust cannot kill it. It found that Gale Crater was once a lake with the chemical ingredients for life — and it has driven more than 30 km up the slopes of Mount Sharp.',
      science: ['Showed that Mars was once habitable', 'Found organic molecules in ancient lakebed mudstone', 'Measured radiation for future human explorers'],
      leftBehind: ['Nothing yet — it is still driving', 'A trail of wheel tracks up the mountain'],
      legacy: 'Curiosity is proof that a well-built machine can keep exploring for a decade and counting.',
      stats: [['Driven so far', '30+ km'], ['Landing method', 'Sky crane'], ['Power', 'Nuclear']],
      sources: [{ label: 'NASA — Curiosity', url: NASA.curiosity }, { label: 'NASA — Mars', url: NASA.mars }]
    },
    {
      id: 'perseverance', name: 'Perseverance', short: 'Perseverance “Percy”',
      type: 'Car-sized rover', body: 'mars', model: 'msl',
      lat: 18.4447, lon: 77.4508, site: 'Jezero Crater — an ancient river delta',
      landed: '18 February 2021', landedYear: 2021, lastContact: 'Still transmitting today', lastYear: 2026,
      status: 'active', mass: '1,025 kg', power: 'Radioisotope power source',
      headline: 'Collecting rocks to send back to Earth — and making oxygen on Mars.',
      story: 'Perseverance is a geologist robot working in a dried-up river delta. It drills cores out of interesting rocks and seals them in tubes, leaving them on the surface for a future mission to pick up and bring home. It also carried Ingenuity, and it turned some Martian air into oxygen.',
      science: ['Coring rock samples for a future return to Earth', 'Converted carbon dioxide into oxygen (MOXIE)', 'Recorded the first sounds from another planet'],
      leftBehind: ['Sample tubes waiting on the Martian surface', 'Nothing else — it is still working'],
      legacy: 'The samples it leaves behind may be the first rocks from Mars that humans ever hold.',
      stats: [['Sample tubes', '40 planned'], ['Mission', 'Mars 2020'], ['Still working', 'Yes']],
      sources: [{ label: 'NASA — Perseverance', url: NASA.perseverance }, { label: 'NASA — Mars', url: NASA.mars }]
    },

    /* ========================================================= DEEP SPACE */
    {
      id: 'voyager1', name: 'Voyager 1', short: 'Voyager 1',
      type: 'Interstellar probe', body: 'deep', model: 'voyager',
      lat: null, lon: null, site: 'Interstellar space — outside the Sun’s bubble',
      landed: 'Launched 5 September 1977', landedYear: 1977, lastContact: 'Still talking, slowly', lastYear: 2026,
      status: 'travelling', mass: '825 kg', power: 'Radioisotope power source',
      distKm: 24500000000, lightSec: 81724,
      headline: 'The farthest object humans have ever built — still calling home from 24 billion km away.',
      story: 'Voyager 1 left Earth in 1977 and never stopped. It photographed Jupiter and Saturn, then kept going out of the solar system entirely. Its radio signal is now so faint that it arrives at Earth with less power than a digital watch needs — and it takes more than 22 hours to get here.',
      science: ['Took the first close-ups of Jupiter and Saturn’s moons', 'Crossed into interstellar space in 2012', 'Carries the Golden Record: sounds and pictures of Earth'],
      leftBehind: ['Nothing — it is still flying outward', 'The Golden Record, for whoever finds it'],
      legacy: 'Voyager 1 is our hand-built ambassador: still travelling after more than 48 years.',
      stats: [['Distance from Earth', '≈24–25 billion km'], ['One-way signal time', '≈23 hours'], ['Still working', 'Yes']],
      sources: [{ label: 'NASA — Voyager', url: NASA.voyager }, { label: 'NASA — Mars fact sheet', url: NASA.factMars }]
    },
    {
      id: 'voyager2', name: 'Voyager 2', short: 'Voyager 2',
      type: 'Interstellar probe', body: 'deep', model: 'voyager',
      lat: null, lon: null, site: 'Interstellar space — the only visitor to Uranus and Neptune',
      landed: 'Launched 20 August 1977', landedYear: 1977, lastContact: 'Still talking, slowly', lastYear: 2026,
      status: 'travelling', mass: '825 kg', power: 'Radioisotope power source',
      distKm: 20500000000, lightSec: 68380,
      headline: 'The only spacecraft ever to visit Uranus and Neptune.',
      story: 'Voyager 2 launched before Voyager 1 and took the slow, grand tour past all four giant planets. No other spacecraft has been back to Uranus or Neptune since. Like its twin, it is now far outside the solar system, whispering home.',
      science: ['Only mission to fly past Uranus (1986) and Neptune (1989)', 'Discovered rings and new moons around the ice giants', 'Entered interstellar space in 2018'],
      leftBehind: ['Nothing — still flying outward', 'Its own Golden Record'],
      legacy: 'For a generation of astronomers, Voyager 2’s pictures are still the only close-ups we have of the ice giants.',
      stats: [['Distance from Earth', '≈20–21 billion km'], ['Planets visited', '4'], ['Still working', 'Yes']],
      sources: [{ label: 'NASA — Voyager', url: NASA.voyager }, { label: 'NASA — Mars fact sheet', url: NASA.factMars }]
    },
    /* ============================================================== EARTH */
    {
      id: 'ksc', name: 'Kennedy Space Center (LC-39)', short: 'Kennedy Space Center',
      type: 'Spaceport & Launch Complex', body: 'earth', model: 'apollo11lm',
      lat: 28.5729, lon: -80.6490, site: 'Cape Canaveral, Florida, Earth',
      landed: 'Established 1962', landedYear: 1962, lastContact: 'Active launch base', lastYear: 2026,
      status: 'active', mass: 'Historic site', power: 'Terrestrial grid',
      headline: 'The launchpad that sent humanity and robotic explorers to the Moon, Mars, and beyond.',
      story: 'Every Apollo Saturn V rocket, the Space Shuttles, and flagship missions to Mars and deep space began their journey from these pads in Florida. It is the starting point for every machine catalogued in this project.',
      science: ['Launch complex 39A & 39B for Apollo, Shuttle, and Artemis', 'Gateway for interplanetary trajectories', 'Historic home of America’s human spaceflight'],
      leftBehind: ['Historic crawler-transporters and gantry structures', 'The pads that pushed humanity beyond Low Earth Orbit'],
      legacy: 'Where Earth reached out to the stars — the origin of every journey in this museum.',
      stats: [['Location', '28.57°N 80.65°W'], ['Apollo launches', '13 Saturn V'], ['Status', 'Active']],
      sources: [{ label: 'NASA — Kennedy Space Center', url: 'https://www.nasa.gov/kennedy/' }, { label: 'NASA — Apollo Program', url: NASA.apollo }]
    }
  ];

  /* ------------------------------------------------------------------ derived + helpers */
  const BODY_META = {
    moon: { label: 'The Moon', color: '#cfd6e4', accent: '#8fb4ff', distanceKm: 384400, miles: '238,855 mi' },
    mars: { label: 'Mars', color: '#e2734a', accent: '#ff8a5c', distanceKm: 225000000, miles: 'varies' },
    earth: { label: 'Earth', color: '#68b4ff', accent: '#4f8fe0', distanceKm: 0, miles: '0 mi' },
    deep: { label: 'Deep space', color: '#a78bfa', accent: '#c4b5fd', distanceKm: null }
  };

  LB.data = {
    NASA,
    STATUS,
    BODY: BODY_META,
    objects: OBJECTS,
    /* groups used by the UI */
    moon: OBJECTS.filter((o) => o.body === 'moon'),
    mars: OBJECTS.filter((o) => o.body === 'mars'),
    earth: OBJECTS.filter((o) => o.body === 'earth'),
    deep: OBJECTS.filter((o) => o.body === 'deep'),
    byId(id) { return OBJECTS.filter((o) => o.id === id)[0] || null; },
    /* the six pieces of hardware that get the full 3D treatment */
    gallery: ['apollo11lm', 'apollo17lm', 'surveyor1', 'opportunity', 'ingenuity', 'insight'],
    /* museum-style counters used on the landing page */
    counters() {
      const quiet = OBJECTS.filter((o) => o.status === 'silent' || o.status === 'retired').length;
      const working = OBJECTS.filter((o) => o.status === 'active' || o.status === 'travelling').length;
      const km = OBJECTS.reduce((a, o) => a + (o.stats && /km/.test(JSON.stringify(o.stats)) ? 0 : 0), 0);
      return { total: OBJECTS.length, quiet: quiet, working: working, moon: this.moon.length, mars: this.mars.length, deep: this.deep.length };
    }
  };

  /* timeline entries: when each machine fell silent (or is still talking) */
  LB.data.timeline = [
    {
      year: 1966, title: 'A robot proves the Moon is solid', kind: 'first',
      text: 'Surveyor 1 touches down softly in the Ocean of Storms and sends back 11,237 photographs. Three years before astronauts, a machine shows the ground will hold them.',
      objects: ['surveyor1']
    },
    {
      year: 1969, title: 'Humans arrive — and leave the bottom half behind', kind: 'first',
      text: 'Apollo 11 lands at Tranquility Base and Apollo 12 follows, close enough to walk to the silent Surveyor 3 robot. Both descent stages stay on the Moon, along with a mirror that still bounces laser light back to Earth.',
      objects: ['apollo11lm', 'apollo12lm', 'surveyor3']
    },
    {
      year: 1971, title: 'The first car on the Moon', kind: 'first',
      text: 'Apollo 15 unloads the Lunar Roving Vehicle. Suddenly astronauts can drive kilometres instead of hopping metres, and the rover is parked on the surface when they fly home.',
      objects: ['apollo15lm']
    },
    {
      year: 1972, title: 'The last footprints — so far', kind: 'first',
      text: 'Apollo 17 leaves the Moon in December 1972. The wheel tracks it left are still sharp, because there is no wind or rain up there to smooth them out.',
      objects: ['apollo17lm']
    },
    {
      year: 1976, title: 'Two laboratories land on Mars', kind: 'first',
      text: 'Viking 1 sends back the first picture ever taken from the surface of Mars: a grey rocky plain, its own footpad in the frame. Viking 2 joins it months later.',
      objects: ['viking1', 'viking2']
    },
    {
      year: 1982, title: 'Viking 1 falls silent', kind: 'quiet',
      text: 'After six years and three months of Martian weather reports, the first lander on Mars stops answering. It is still sitting in Chryse Planitia today.',
      objects: ['viking1']
    },
    {
      year: 1997, title: 'A rover the size of a microwave', kind: 'first',
      text: 'Mars Pathfinder bounces to a stop on airbags and releases Sojourner, which trundles about 100 metres — the first wheels to turn on another planet.',
      objects: ['pathfinder']
    },
    {
      year: 2004, title: 'Two rovers promised 90 days', kind: 'first',
      text: 'Spirit and Opportunity land on opposite sides of Mars. Their warranty is 90 sols. They keep going for years, finding rocks that prove water once pooled on the surface.',
      objects: ['spirit', 'opportunity']
    },
    {
      year: 2008, title: 'Phoenix touches Martian ice', kind: 'first',
      text: 'Landing near the north pole, Phoenix scrapes the soil and finds water ice — the first time anyone has touched it. When winter comes, its solar panels are covered in frost and it goes quiet.',
      objects: ['phoenix']
    },
    {
      year: 2010, title: 'Spirit gets stuck', kind: 'quiet',
      text: 'Spirit breaks through a crust into soft sand at a place called Troy. Engineers try for months to free it, then park it as a stationary science station. It is heard from one last time in March 2010.',
      objects: ['spirit']
    },
    {
      year: 2012, title: 'A car-sized rover lands on cables', kind: 'first',
      text: 'Curiosity is lowered onto the surface by a rocket-powered sky crane. It is still climbing Mount Sharp today, drilling rocks and telling us what ancient Mars was like.',
      objects: ['curiosity']
    },
    {
      year: 2018, title: 'Opportunity disappears in a dust storm', kind: 'quiet',
      text: 'A planet-wide dust storm blots out the Sun and the record-setting rover goes silent after 45.16 km. NASA plays it a final song: “I Will Be Seeing You”.',
      objects: ['opportunity']
    },
    {
      year: 2021, title: 'A rover, a helicopter and a machine that makes oxygen', kind: 'first',
      text: 'Perseverance lands in a dried-up river delta with a sample-collecting drill, and a 1.8 kg helicopter rides underneath. Ingenuity flies for the first time on 19 April 2021.',
      objects: ['perseverance', 'ingenuity']
    },
    {
      year: 2022, title: 'InSight stops listening', kind: 'quiet',
      text: 'Dust covers its solar panels and the lander runs out of power. In four years it recorded 1,319 marsquakes, mapping the inside of another planet for the first time.',
      objects: ['insight']
    },
    {
      year: 2024, title: 'Ingenuity breaks a blade', kind: 'quiet',
      text: 'Flight 72 damages a rotor tip and the helicopter never flies again — 67 flights past its original plan of five. NASA names the spot “Valinor Hills”.',
      objects: ['ingenuity']
    },
    {
      year: 2026, title: 'Still talking', kind: 'now',
      text: 'Curiosity and Perseverance are still working on Mars. Two Voyagers have left the solar system and still answer, more than 20 light-hours away. Everything else in this story is waiting, quietly, where we left it.',
      objects: ['curiosity', 'perseverance', 'voyager1', 'voyager2']
    }
  ];

  /* ------------------------------------------------------------------ glossary */
  LB.data.glossary = [
    ['Descent stage', 'The bottom half of a lunar lander. It holds the landing engine and legs, and stays on the Moon when astronauts fly the top half home.'],
    ['Sol', 'One Martian day: 24 hours and 39 minutes. A “90-sol mission” means 90 days of Mars time.'],
    ['Light-time', 'How long a radio signal takes to travel between Earth and a spacecraft. Radio waves move at the speed of light, so “instant” messages are not instant.'],
    ['Retroreflector', 'A special mirror that bounces light straight back where it came from. Astronauts left some on the Moon; observatories still use them to measure the Moon’s distance.'],
    ['Radioisotope power', 'Electricity made from the heat of decaying plutonium. No sunlight or moving parts — that is why Curiosity and Perseverance last so long.'],
    ['Telemetry', 'The data a spacecraft sends home: temperatures, pictures, battery levels, science readings.'],
    ['Marsquake', 'A quake on Mars. InSight felt 1,319 of them.'],
    ['Downlink', 'The radio link from a spacecraft down to Earth. Uplink is Earth to spacecraft.']
  ];

  /* ------------------------------------------------------------------ mission strip */
  LB.data.strip = [
    ['18 machines', 'in this story'],
    ['1966–2024', 'years of leaving things behind'],
    ['384,400 km', 'to the Moon'],
    ['~225 million km', 'to Mars (average)'],
    ['6 objects', 'you can turn in 3D'],
    ['1.28 seconds', 'for radio to reach the Moon'],
    ['1,319', 'marsquakes recorded by InSight'],
    ['45.16 km', 'the Mars driving record'],
    ['24 billion km', 'to Voyager 1']
  ];
})();
