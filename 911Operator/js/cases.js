/* ============================================================
   cases.js — scripted shift data: map config, units, and the
   8-case shift with branching dialogue trees per department.
   ============================================================ */

const MAP_CONFIG = {
  viewBox: '0 0 300 300',
  depots: {
    police:    { x: 40,  y: 40,  label: 'POLICE HQ' },
    fire:      { x: 260, y: 40,  label: 'FIRE STA. 1' },
    ambulance: { x: 40,  y: 260, label: 'ST. MERCY HOSP.' },
  },
  roads: [
    [0, 40, 300, 40], [0, 150, 300, 150], [0, 260, 300, 260],
    [40, 0, 40, 300], [150, 0, 150, 300], [260, 0, 260, 300],
    [0, 90, 300, 90], [0, 220, 300, 220], [90, 0, 90, 300], [220, 0, 220, 300],
  ],
};

const UNITS = [
  { id: 'P1', type: 'police',    label: 'UNIT 12',   glyph: '★' },
  { id: 'P2', type: 'police',    label: 'UNIT 27',   glyph: '★' },
  { id: 'F1', type: 'fire',      label: 'ENGINE 3',  glyph: '▲' },
  { id: 'F2', type: 'fire',      label: 'LADDER 5',  glyph: '▲' },
  { id: 'A1', type: 'ambulance', label: 'MEDIC 8',   glyph: '✚' },
  { id: 'A2', type: 'ambulance', label: 'MEDIC 14',  glyph: '✚' },
];

/* ---------------------------------------------------------------
   Each case:
   - department: which chat windows activate
   - requiredUnitTypes: unit types that must reach the scene to win
   - falseAlarm: if true, correct play resolves via dialogue only,
     no location is ever revealed, and no unit should be sent
   - urgencyTime: seconds on the clock once the first window opens
   - location: {x,y,name} — hidden until a dialogue effect reveals it
   - dialogue[dept]: { callerName, start, nodes }
   --------------------------------------------------------------- */

const CASES = {

  case1: {
    id: 'case1',
    title: 'Collapse — Difficulty Breathing',
    department: ['ambulance'],
    requiredUnitTypes: ['ambulance'],
    urgencyTime: 100,
    location: { x: 150, y: 90, name: '118 Maple St, Apt 4B' },
    dialogue: {
      ambulance: {
        callerName: 'M. Alvarez (neighbor)',
        start: 'n1',
        nodes: {
          n1: { speaker: 'caller', text: "Please... my grandfather just collapsed, he's clutching his chest, I don't know what to do!",
            choices: [
              { label: 'Stay with me — is he breathing and conscious?', next: 'n2a', effects: { goodChoice: true } },
              { label: 'Just start CPR on him right now!', next: 'n2b', effects: { urgencyDelta: -10 } },
            ] },
          n2a: { speaker: 'caller', text: "He's breathing but he won't answer me, he's sweating and really pale.",
            choices: [
              { label: "I'm sending an ambulance now. Keep him seated upright, don't lay him flat.", next: 'n3', effects: { reveal: true, goodChoice: true, urgencyDelta: 15 } },
              { label: 'Just wait there, help is coming.', next: 'n3', effects: { reveal: true } },
            ] },
          n2b: { speaker: 'caller', text: "I- okay I'm trying, but I don't think I'm doing it right, he's still breathing though!",
            choices: [
              { label: 'Stop — since he IS breathing, no CPR. Just keep him calm and seated.', next: 'n3', effects: { reveal: true, urgencyDelta: 5, note: 'CPR is only for a person not breathing — good catch.' } },
            ] },
          n3: { speaker: 'dispatcher', text: 'Address confirmed — 118 Maple St, Apt 4B. Ambulance en route.', next: 'n4' },
          n4: { speaker: 'caller', text: 'Please hurry, his lips are turning blue...' },
        },
      },
    },
    outcomeGood: { ambulance: "MEDIC 8 ON SCENE. Patient stabilized and transported to St. Mercy. He'll pull through." },
    outcomeBad: { ambulance: 'TIMER EXPIRED. Patient went into cardiac arrest before medics arrived on scene.' },
  },

  case2: {
    id: 'case2',
    title: 'Break-In In Progress',
    department: ['police'],
    requiredUnitTypes: ['police'],
    urgencyTime: 100,
    location: { x: 220, y: 150, name: '212 Riverside Ave' },
    dialogue: {
      police: {
        callerName: 'D. Whitfield (homeowner)',
        start: 'n1',
        nodes: {
          n1: { speaker: 'caller', text: "(whispering) Someone just broke in downstairs... I'm hiding in the upstairs closet, please hurry.",
            choices: [
              { label: 'Stay quiet and stay on the line. Do you know if they are armed?', next: 'n2a', effects: { goodChoice: true } },
              { label: 'Try to sneak out through a window right now.', next: 'n2b', effects: { urgencyDelta: -10 } },
            ] },
          n2a: { speaker: 'caller', text: "(whispering) I don't know, I can hear them going through drawers downstairs.",
            choices: [
              { label: 'Good. Stay hidden, stay silent — officers are on the way.', next: 'n3', effects: { reveal: true, goodChoice: true, urgencyDelta: 10 } },
            ] },
          n2b: { speaker: 'caller', text: '(whispering) Okay I- (a soft thud) ...oh no, they heard that!',
            choices: [
              { label: 'Stop! Get back and hide, do not engage them.', next: 'n3', effects: { reveal: true, urgencyDelta: -5 } },
            ] },
          n3: { speaker: 'dispatcher', text: 'Location confirmed — 212 Riverside Ave. Units dispatched.', next: 'n4' },
          n4: { speaker: 'caller', text: '(whispering) Please hurry, I can hear footsteps on the stairs...' },
        },
      },
    },
    outcomeGood: { police: 'UNIT 12 ON SCENE. Suspect apprehended leaving the residence. Homeowner unharmed.' },
    outcomeBad: { police: 'TIMER EXPIRED. Caller lost contact before officers arrived on scene.' },
  },

  case3: {
    id: 'case3',
    title: 'Kitchen Fire — Spreading',
    department: ['fire'],
    requiredUnitTypes: ['fire'],
    urgencyTime: 100,
    location: { x: 90, y: 150, name: '214 Oak Lane' },
    dialogue: {
      fire: {
        callerName: 'J. Park (resident)',
        start: 'n1',
        nodes: {
          n1: { speaker: 'caller', text: "There's a fire, it started on the stove, it's getting bigger — what do I do?!",
            choices: [
              { label: 'If safe, turn off the burner, then get everyone out of the house.', next: 'n2a', effects: { goodChoice: true, urgencyDelta: 10 } },
              { label: 'Throw water on it!', next: 'n2b', effects: { urgencyDelta: -15, note: 'Water on a grease fire makes it explode outward — never do that.' } },
            ] },
          n2a: { speaker: 'caller', text: "Okay, we're getting out — but it's spreading to the curtains now!",
            choices: [
              { label: 'Just get everyone outside and stay clear. Firefighters are on the way.', next: 'n3', effects: { reveal: true, goodChoice: true } },
            ] },
          n2b: { speaker: 'caller', text: 'I did it and it just got so much bigger, there is fire everywhere now!',
            choices: [
              { label: 'Get out of the house immediately, do not try to fight it.', next: 'n3', effects: { reveal: true, urgencyDelta: -5 } },
            ] },
          n3: { speaker: 'dispatcher', text: 'Address confirmed — 214 Oak Lane. Engine dispatched.', next: 'n4' },
          n4: { speaker: 'caller', text: "We're outside now but I can see it through the window, please hurry!" },
        },
      },
    },
    outcomeGood: { fire: 'ENGINE 3 ON SCENE. Fire contained to the kitchen. Everyone made it out safely.' },
    outcomeBad: { fire: 'TIMER EXPIRED. Fire spread through the house before the engine arrived.' },
  },

  case4: {
    id: 'case4',
    title: 'Multi-Vehicle Collision — Injuries',
    department: ['police', 'ambulance'],
    requiredUnitTypes: ['police', 'ambulance'],
    urgencyTime: 130,
    location: { x: 180, y: 220, name: 'Highway 9 & 3rd St' },
    dialogue: {
      ambulance: {
        callerName: 'Crash victim (dazed)',
        start: 'n1',
        nodes: {
          n1: { speaker: 'caller', text: "There's been an accident, two cars... someone's hurt bad, there's blood, I don't know what to do.",
            choices: [
              { label: 'Is she conscious and breathing? Do not move her if you suspect a back injury.', next: 'n2a', effects: { goodChoice: true } },
              { label: 'Pull her out of the car quickly.', next: 'n2b', effects: { urgencyDelta: -15, note: 'Moving a possible spinal injury can cause permanent damage.' } },
            ] },
          n2a: { speaker: 'caller', text: "She's awake but she says she can't feel her legs.",
            choices: [
              { label: 'Do not move her. Keep her still and talk to her until medics arrive.', next: 'n3', effects: { reveal: true, goodChoice: true, urgencyDelta: 10 } },
            ] },
          n2b: { speaker: 'caller', text: 'I- I tried, she screamed in pain, I stopped.',
            choices: [
              { label: 'Do not move her again. Wait for paramedics.', next: 'n3', effects: { reveal: true, urgencyDelta: -5 } },
            ] },
          n3: { speaker: 'dispatcher', text: 'Location confirmed — Highway 9 & 3rd St. Medic unit dispatched.', next: 'n4' },
          n4: { speaker: 'caller', text: 'Please hurry, she is getting quiet...' },
        },
      },
      police: {
        callerName: 'R. Coyle (passerby)',
        start: 'n1',
        nodes: {
          n1: { speaker: 'caller', text: "Calling about the crash at Highway 9 and 3rd — the other driver got out and he's yelling, I think he's drunk.",
            choices: [
              { label: 'Stay back and keep your distance. Do not approach him.', next: 'n2a', effects: { goodChoice: true } },
              { label: 'Go try to calm him down yourself.', next: 'n2b', effects: { urgencyDelta: -10 } },
            ] },
          n2a: { speaker: 'caller', text: "Okay, staying back — he's stumbling near the road, cars are swerving around him.",
            choices: [
              { label: 'Understood, officers are on the way. Stay clear of the road.', next: 'n3', effects: { reveal: true, goodChoice: true } },
            ] },
          n2b: { speaker: 'caller', text: 'I tried but he shoved me, I nearly fell into traffic!',
            choices: [
              { label: 'Back away now, let the officers handle it.', next: 'n3', effects: { reveal: true, urgencyDelta: -5 } },
            ] },
          n3: { speaker: 'dispatcher', text: 'Location confirmed — Highway 9 & 3rd St. Unit dispatched.', next: 'n4' },
          n4: { speaker: 'caller', text: "He's still out here stumbling around, please hurry." },
        },
      },
    },
    outcomeGood: {
      ambulance: 'MEDIC 8 ON SCENE. Victim stabilized and transported. Expected to recover.',
      police: 'UNIT 27 ON SCENE. Intoxicated driver detained. Traffic secured.',
    },
    outcomeBad: {
      ambulance: 'TIMER EXPIRED. Victim lost consciousness before medics arrived.',
      police: 'TIMER EXPIRED. Scene remained unsecured — a second collision occurred nearby.',
    },
  },

  case5: {
    id: 'case5',
    title: 'Structure Fire — People Trapped',
    department: ['fire', 'ambulance'],
    requiredUnitTypes: ['fire', 'ambulance'],
    urgencyTime: 140,
    location: { x: 60, y: 220, name: '45 Cedar Row' },
    dialogue: {
      fire: {
        callerName: 'T. Nkomo (neighbor)',
        start: 'n1',
        nodes: {
          n1: { speaker: 'caller', text: 'The townhouse next door is on fire, flames on the second floor — I think the Hendersons are still inside!',
            choices: [
              { label: 'Do you know how many people, and roughly where in the house?', next: 'n2a', effects: { goodChoice: true } },
              { label: 'Go inside and get them yourself!', next: 'n2b', effects: { urgencyDelta: -15, note: 'Never send a caller into a burning building.' } },
            ] },
          n2a: { speaker: 'caller', text: "I think it's the mom and her two kids, upstairs — the smoke's getting really thick now.",
            choices: [
              { label: 'Stay outside, do not go in. Firefighters are being dispatched now.', next: 'n3', effects: { reveal: true, goodChoice: true, urgencyDelta: 10 } },
            ] },
          n2b: { speaker: 'caller', text: 'I got to the door but the smoke is too thick, I can\'t go further!',
            choices: [
              { label: 'Get back outside right now, that is too dangerous!', next: 'n3', effects: { reveal: true, urgencyDelta: -10 } },
            ] },
          n3: { speaker: 'dispatcher', text: 'Address confirmed — 45 Cedar Row. Engine and ladder dispatched.', next: 'n4' },
          n4: { speaker: 'caller', text: 'I can hear someone coughing near a window upstairs...' },
        },
      },
      ambulance: {
        callerName: 'Henderson child (upstairs)',
        start: 'n1',
        nodes: {
          n1: { speaker: 'caller', text: '(coughing) Mommy said to call... we\'re stuck upstairs, the smoke is really bad...',
            choices: [
              { label: 'Stay low to the ground, cover your mouth with cloth if you can. Help is coming.', next: 'n2a', effects: { goodChoice: true } },
              { label: 'Try to run through the smoke to the stairs.', next: 'n2b', effects: { urgencyDelta: -15, note: 'Running through smoke is extremely dangerous — always stay low.' } },
            ] },
          n2a: { speaker: 'caller', text: '(coughing) Okay... we\'re by the window...',
            choices: [
              { label: 'Good, stay right there by the window. Firefighters will find you.', next: 'n3', effects: { reveal: true, goodChoice: true, urgencyDelta: 10 } },
            ] },
          n2b: { speaker: 'caller', text: "(coughing hard) I can't see, it's too smoky...",
            choices: [
              { label: 'Stop! Get low and go back to the window, stay put!', next: 'n3', effects: { reveal: true, urgencyDelta: -5 } },
            ] },
          n3: { speaker: 'dispatcher', text: 'Address confirmed — 45 Cedar Row. Medic unit staged nearby.', next: 'n4' },
          n4: { speaker: 'caller', text: '(coughing) ...we\'re waiting by the window...' },
        },
      },
    },
    outcomeGood: {
      fire: 'LADDER 5 ON SCENE. Family rescued from the second floor window. Fire knocked down.',
      ambulance: 'MEDIC 8 ON SCENE. Family treated for smoke inhalation, all stable.',
    },
    outcomeBad: {
      fire: 'TIMER EXPIRED. Fire crews arrived too late to reach the upper floor safely.',
      ambulance: 'TIMER EXPIRED. Smoke inhalation became critical before medics arrived.',
    },
  },

  case6: {
    id: 'case6',
    title: 'Disturbance — Welfare Check',
    department: ['police'],
    requiredUnitTypes: ['police'],
    urgencyTime: 90,
    location: { x: 220, y: 90, name: '88 Birch Ct, Unit 3' },
    dialogue: {
      police: {
        callerName: 'S. Iyer (neighbor)',
        start: 'n1',
        nodes: {
          n1: { speaker: 'caller', text: "I keep hearing shouting from the apartment next door, it's been going on for twenty minutes, I'm worried.",
            choices: [
              { label: 'Can you tell if anyone is in immediate danger, or is it just verbal so far?', next: 'n2a', effects: { goodChoice: true } },
              { label: 'Go bang on their door and tell them to stop.', next: 'n2b', effects: { urgencyDelta: -10, note: 'Inserting yourself into someone else\'s dispute can escalate it.' } },
            ] },
          n2a: { speaker: 'caller', text: "It's just yelling right now, I haven't heard anything break or anyone scream.",
            choices: [
              { label: 'Okay, stay inside with your door locked. Officers are heading over to check on them.', next: 'n3', effects: { reveal: true, goodChoice: true } },
            ] },
          n2b: { speaker: 'caller', text: 'I knocked and now they are both yelling at ME instead!',
            choices: [
              { label: 'Step away and go back inside now, let officers handle it.', next: 'n3', effects: { reveal: true, urgencyDelta: -5 } },
            ] },
          n3: { speaker: 'dispatcher', text: 'Address confirmed — 88 Birch Ct, Unit 3. Officers dispatched for a welfare check.', next: 'n4' },
          n4: { speaker: 'caller', text: "I don't hear anything now... that's almost worse." },
        },
      },
    },
    outcomeGood: { police: 'UNIT 27 ON SCENE. Situation de-escalated, both parties safe and separated for the night.' },
    outcomeBad: { police: 'TIMER EXPIRED. Neighbors reported the shouting turned physical before officers arrived.' },
  },

  case7: {
    id: 'case7',
    title: 'Unconfirmed Call — Unknown Nature',
    department: ['police'],
    requiredUnitTypes: [],
    falseAlarm: true,
    urgencyTime: 120,
    location: { x: 130, y: 200, name: 'Unknown' },
    dialogue: {
      police: {
        callerName: 'Unidentified caller (child)',
        start: 'n1',
        nodes: {
          n1: { speaker: 'caller', text: "Um, hi. There's a monster in my closet and my mommy is sleeping and I don't know what to do.",
            choices: [
              { label: 'Okay — is your mommy safe in the house with you right now?', next: 'n2a', effects: { goodChoice: true } },
              { label: 'Stay calm, I am sending officers to your house right now!', next: 'n2b', effects: {} },
            ] },
          n2a: { speaker: 'caller', text: "Yeah she's right in her room, I just heard a noise and got scared.",
            choices: [
              { label: 'That was probably just the house settling, or a pet. You are safe — go wake your mommy for a hug?', next: 'n3', effects: { goodChoice: true, resolveFalseAlarm: true } },
              { label: 'There could really be a monster — stay away from the closet!', next: 'n3', effects: { resolveFalseAlarm: true } },
            ] },
          n2b: { speaker: 'caller', text: "O-okay...", choices: [
              { label: 'Actually — it sounds like there is no real danger here. Go get your mommy for a hug, alright?', next: 'n3', effects: { resolveFalseAlarm: true } },
            ] },
          n3: { speaker: 'dispatcher', text: 'Call resolved through the line — no units required.' },
        },
      },
    },
    outcomeGood: { police: 'CALL CLOSED. No emergency present. Good judgment keeping a unit free for real calls.' },
    outcomeBad: { police: 'A unit was tied up on a non-emergency while other calls were waiting.' },
  },

  case8: {
    id: 'case8',
    title: 'FINALE — Explosion & Fire, Downtown Plaza',
    department: ['fire', 'police', 'ambulance'],
    requiredUnitTypes: ['fire', 'police', 'ambulance'],
    urgencyTime: 170,
    location: { x: 150, y: 150, name: '500 Plaza Center' },
    dialogue: {
      fire: {
        callerName: 'Security guard',
        start: 'n1',
        nodes: {
          n1: { speaker: 'caller', text: "There's been an explosion in the parking structure at Downtown Plaza, it's on fire and spreading toward the building, people are running everywhere!",
            choices: [
              { label: 'Can you get people moving away from the building, toward the street?', next: 'n2a', effects: { goodChoice: true } },
              { label: 'Try to put it out with an extinguisher.', next: 'n2b', effects: { urgencyDelta: -15, note: 'Not survivable for an explosion-fed fire.' } },
            ] },
          n2a: { speaker: 'caller', text: "Yes, directing people out now — but smoke is pouring into the lobby!",
            choices: [
              { label: 'Good, keep everyone moving to the street. Fire crews are inbound.', next: 'n3', effects: { reveal: true, goodChoice: true, urgencyDelta: 15 } },
            ] },
          n2b: { speaker: 'caller', text: "It didn't work — the fire's bigger now and climbing the stairwell!",
            choices: [
              { label: 'Drop it and get everyone out now, that fire is not safe to fight!', next: 'n3', effects: { reveal: true, urgencyDelta: -10 } },
            ] },
          n3: { speaker: 'dispatcher', text: 'Address confirmed — 500 Plaza Center. Multiple units dispatched.', next: 'n4' },
          n4: { speaker: 'caller', text: 'The whole lobby is filling with smoke, please hurry!' },
        },
      },
      police: {
        callerName: 'Office worker',
        start: 'n1',
        nodes: {
          n1: { speaker: 'caller', text: "People are panicking, running into the street, cars are stopped everywhere, and I think someone's trapped in a car near the structure!",
            choices: [
              { label: 'Tell people near you to move to the sidewalk, away from the street.', next: 'n2a', effects: { goodChoice: true } },
              { label: 'Tell them to just run wherever, get away fast.', next: 'n2b', effects: { urgencyDelta: -10, note: 'Unclear direction into traffic is dangerous.' } },
            ] },
          n2a: { speaker: 'caller', text: "Okay, getting people to the sidewalk — but that car with someone trapped hasn't moved.",
            choices: [
              { label: 'Keep everyone else clear of the roadway. Officers will handle the car and traffic.', next: 'n3', effects: { reveal: true, goodChoice: true } },
            ] },
          n2b: { speaker: 'caller', text: 'Some of them ran right into the street, a car nearly hit two people!',
            choices: [
              { label: 'Get everyone to the sidewalk now and keep them there!', next: 'n3', effects: { reveal: true, urgencyDelta: -5 } },
            ] },
          n3: { speaker: 'dispatcher', text: 'Address confirmed — 500 Plaza Center. Units dispatched for crowd and traffic control.', next: 'n4' },
          n4: { speaker: 'caller', text: 'Still one person stuck in that car, please hurry!' },
        },
      },
      ambulance: {
        callerName: 'Bystander with victim',
        start: 'n1',
        nodes: {
          n1: { speaker: 'caller', text: "Someone got knocked down by the blast, she's got a bad burn on her arm and she's not really responding to me!",
            choices: [
              { label: 'Is she breathing normally? Try not to touch the burn, keep her calm and still.', next: 'n2a', effects: { goodChoice: true } },
              { label: 'Put water and ice directly on the burn.', next: 'n2b', effects: { urgencyDelta: -10, note: 'Ice can worsen burn damage.' } },
            ] },
          n2a: { speaker: 'caller', text: "She's breathing but really out of it, mumbling.",
            choices: [
              { label: 'Stay with her, keep talking to her, do not move her — medics are coming.', next: 'n3', effects: { reveal: true, goodChoice: true, urgencyDelta: 10 } },
            ] },
          n2b: { speaker: 'caller', text: 'I did, she flinched hard and cried out in pain.',
            choices: [
              { label: 'Stop — just cover it loosely with a clean cloth and wait for medics.', next: 'n3', effects: { reveal: true, urgencyDelta: -5 } },
            ] },
          n3: { speaker: 'dispatcher', text: 'Address confirmed — 500 Plaza Center. Medic units dispatched.', next: 'n4' },
          n4: { speaker: 'caller', text: "She's still not really talking to me, please hurry!" },
        },
      },
    },
    outcomeGood: {
      fire: 'ENGINE 3 & LADDER 5 ON SCENE. Blaze knocked down before it reached the tower. No further casualties.',
      police: 'UNIT 12 ON SCENE. Crowd and traffic secured, trapped driver freed safely.',
      ambulance: 'MEDIC 14 ON SCENE. Burn victim treated and transported, expected to recover.',
    },
    outcomeBad: {
      fire: 'TIMER EXPIRED. Fire reached the tower structure before crews arrived.',
      police: 'TIMER EXPIRED. Crowd control failed to reach the scene in time.',
      ambulance: 'TIMER EXPIRED. Burn victim\'s condition became critical before medics arrived.',
    },
  },
};

const SHIFT_ORDER = ['case1', 'case2', 'case3', 'case4', 'case5', 'case6', 'case7', 'case8'];
