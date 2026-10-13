/*
 * Saving for Mission Builder: all the words.
 * Edit any text here. Keep the quote marks and commas.
 * The ids (fee, flights, minimums, pot ...) are used by logic.js, so don't
 * change those. Words in {curly brackets} are filled in with the person's
 * own figures.
 *
 * Bible verses are NIV unless the reference says otherwise.
 */

window.MIM_MISSION_CONTENT = {

  intro: {
    eyebrow: 'Free tool · about 15 minutes',
    title: 'Saving for Mission Builder',
    lead: 'Heading off on a mission trip, a gap year or a church team trip, and just seen the cost? Let’s turn that number into a plan.',
    body: [
      'If God is calling you to go, provision is His responsibility before it’s yours. That isn’t a pass to sit back: God meets us as we do what we can with what He’s given us.',
      'Know the real number, bring what’s already in your hand, be faithful with it, and whatever gap is left becomes a prayer of faith.'
    ],
    points: [
      'Six short steps. Your figures add up as you type.',
      'Everything stays on this device. We don’t store or see it.'
    ],
    start: 'Start my plan',
    example: 'See a worked example',
    welcomeBack: 'Welcome back. Your plan is saved on this device.',
    carryOn: 'Carry on',
    startAgain: 'Start again',
    startAgainConfirm: 'Start again? This clears everything you’ve typed from this device.',
    exampleConfirm: 'The example will replace what you’ve typed so far.',
    exampleYes: 'Show the example',
    keepMine: 'Keep mine',
    versesSummary: 'Where this comes from',
    verses: [
      { text: 'The earth is the Lord’s, and everything in it, the world, and all who live in it.', ref: 'Psalm 24:1' },
      { text: 'But remember the Lord your God, for it is he who gives you the ability to produce wealth…', ref: 'Deuteronomy 8:18' },
      { text: 'But seek first his kingdom and his righteousness, and all these things will be given to you as well.', ref: 'Matthew 6:33' }
    ]
  },

  ui: {
    stepCount: 'Step {n} of 6',
    stepsLabel: 'The six steps',
    goToStep: 'Step {n}: {title}',
    back: 'Back',
    next: 'Next: {title}',
    toStart: 'Back to the start',
    exampleBanner: 'This is a worked example: a £2,400 trip with the money due in 8 months. Change any figure to see the sums move.',
    exampleClear: 'Clear it and start my own',
    saved: 'Your plan saves as you go, on this device only.',
    clear: 'Clear my data',
    clearConfirm: 'Clear everything you’ve typed from this device?',
    clearYes: 'Yes, clear it',
    clearNo: 'Keep it',
    cleared: 'Done. Your data has been cleared from this device.',
    remove: 'Remove {what}',
    thisLine: 'this line',
    notANumber: 'Numbers only, like 250',
    noMinus: 'No minus figures here',
    perMonth: '{amount} a month',
    month: 'month',
    months: 'months',
    optional: '(optional)',
    addOwn: '+ Add your own',
    full: 'That’s the most this list holds.'
  },

  // The figures A to G, in the summary bar and on the PDFs.
  letters: {
    A: { label: 'Total cost', short: 'Total cost' },
    B: { label: 'Total in hand', short: 'In hand' },
    C: { label: 'Still to find', short: 'Still to find' },
    D: { label: 'Monthly target', short: 'Monthly target' },
    E: { label: 'New monthly margin', short: 'New margin' },
    F: { label: 'Saved by the due date', short: 'Saved by due date' },
    G: { label: 'The gap', short: 'The gap' }
  },
  summaryLabel: 'Your figures so far',

  // Short names for the six steps (step navigation and page title).
  stepNames: ['Your mission', 'Count the cost', 'What’s in your hand?', 'What you can fund yourself', 'The gap', 'Set it up this week'],

  /* Step 1 */
  mission: {
    title: 'Your mission',
    intro: 'Start with the basics: where you’re going, when, and the date the money has to be paid.',
    where: { label: 'Where I’m going', placeholder: 'e.g. A summer team in Uganda' },
    away: 'Dates away',
    leave: 'I leave on',
    back: 'I’m back on',
    due: { label: 'The date the money is due', hint: 'Check with your programme. It’s often before you fly.' },
    monthsLabel: 'Months to save',
    status: {
      none: 'Add the due date and we’ll count the months you have to save.',
      ok: 'That gives you {months} from today to save toward it.',
      soon: 'That’s less than a month away, so there isn’t time to save monthly. Talk it through with your programme leader.',
      past: 'That date has already gone. Check it, or talk to your programme leader.'
    },
    backBeforeLeave: 'Your return date is before you leave. Worth a second look.',
    dueAfterLeave: 'That’s after you fly. Most programmes want the money before you go, so it’s worth double-checking.'
  },

  /* Step 2 */
  costs: {
    title: 'Count the cost',
    intro: 'The headline figure is rarely the real figure. Put in everything this trip will cost you, and skip anything that doesn’t apply.',
    verse: { text: 'Suppose one of you wants to build a tower. Won’t you first sit down and estimate the cost?', ref: 'Luke 14:28' },
    items: [
      { id: 'fee', label: 'Programme or trip fee', hint: 'The headline figure' },
      { id: 'flights', label: 'Flights and baggage' },
      { id: 'visa', label: 'Visa' },
      { id: 'health', label: 'Vaccinations and antimalarials' },
      { id: 'insurance', label: 'Travel insurance' },
      { id: 'kit', label: 'Kit', hint: 'Bag, boots, clothing, mosquito net' },
      { id: 'incountry', label: 'Travel and food in-country', hint: 'If they’re not included' },
      { id: 'phone', label: 'Phone SIM or roaming' },
      { id: 'spending', label: 'Spending money' },
      { id: 'gifts', label: 'Gifts for hosts' },
      { id: 'airport', label: 'Getting to and from the airport' },
      { id: 'wages', label: 'Wages lost', hint: 'If the leave is unpaid' }
    ],
    otherHeading: 'Anything else',
    otherIntro: 'Add anything this list has missed.',
    otherPlaceholder: 'What is it?',
    otherLabel: 'Something else, line {n}',
    amountLabel: 'Cost of {what}',
    total: 'Total cost',
    tip: 'Tip: ask the programme for a full cost breakdown. And ask someone who went last year what they wish they’d budgeted for.'
  },

  /* Step 3 */
  hand: {
    title: 'What’s in your hand?',
    intro: 'Before God did a miracle for Moses, He asked what Moses already had.',
    verse: { text: 'What is that in your hand?', ref: 'Exodus 4:2' },
    savings: { label: 'Savings I can put toward this', hint: 'Not your emergency fund. This isn’t an emergency.' },
    sellHeading: 'Things I could sell',
    sellHint: 'Up to three. A rough figure is fine.',
    sellPlaceholder: 'e.g. Old games console',
    sellLabel: 'Thing to sell {n}',
    sellAmountLabel: 'What thing {n} might sell for',
    promised: { label: 'Gifts or sponsorship already promised' },
    total: 'Total in hand',
    debt: {
      heading: 'A quick debt check',
      intro: 'Tick any that are true for you.',
      signs: [
        { id: 'minimums', label: 'I only ever make minimum payments' },
        { id: 'notFalling', label: 'My balances aren’t really going down' },
        { id: 'creditMonth', label: 'I use credit to get through a normal month' },
        { id: 'yearIncome', label: 'What I owe is close to, or more than, a year’s income' }
      ],
      careHeading: 'Talk to someone before putting money toward the trip',
      careBody: 'StepChange, CAP and Citizens Advice are free. They’ll look at the whole picture with you, in confidence. Getting this sorted first is wisdom, not failure.',
      studentLoan: 'Student loan? Leave it out. For most people it works more like a tax.'
    }
  },

  /* Step 4 */
  fund: {
    title: 'What you can fund yourself',
    intro: 'Here’s what’s left to find, and what that means each month.',
    lessInHand: 'Less what’s in your hand',
    monthsUntil: 'Months until it’s due',
    needDue: 'Add the date the money is due (Step 1) to see your monthly target.',
    soon: 'With less than a month to go, there’s no monthly target. Talk it through with your programme leader.',
    margin: {
      label: 'My monthly margin today',
      hint: 'What’s left each month after everything else is paid.',
      app: 'Not sure? The free Money in Motion app will help you find it.',
      appLink: 'Open the app',
      negative: 'If more is going out than coming in, put 0 for now. The free app will help you see where it’s going.'
    },
    rsHeading: 'Widen it with the three Rs',
    rsIntro: 'Remove it, reduce it, or replace it with something cheaper. Put in what each change frees up a month.',
    rs: { remove: 'Remove', reduce: 'Reduce', replace: 'Replace' },
    rsLabel: 'Remove, reduce or replace',
    rsChips: [
      { label: 'Streaming', r: 'remove' },
      { label: 'Takeaways', r: 'reduce' },
      { label: 'Phone or data plan', r: 'replace' },
      { label: 'Gym', r: 'replace' },
      { label: 'Subscriptions', r: 'remove' }
    ],
    rsChipsLabel: 'Ideas to add',
    rsPlaceholder: 'What will you change?',
    rsRowLabel: 'Change {n}',
    incomeHeading: 'Extra income',
    incomeIntro: 'Anything you could earn on top each month until the money is due.',
    incomeChips: ['An extra shift', 'Babysitting', 'Selling a skill'],
    incomePlaceholder: 'Where from?',
    incomeRowLabel: 'Extra income {n}',
    monthlyAmountLabel: 'Pounds a month from {what}',
    marginToday: 'Margin today',
    freed: 'Freed up with the three Rs',
    extra: 'Extra income',
    times: '× {months}',
    onTarget: 'That covers your monthly target.',
    short: 'That’s {amount} a month short of your target. Step 5 is where that goes.',
    verse: { text: 'Whoever gathers money little by little makes it grow.', ref: 'Proverbs 13:11' }
  },

  /* Step 5 */
  gap: {
    title: 'The gap',
    lessSaved: 'Less what you’ll save by the due date',
    needCosts: 'Add your costs in Step 2 first, and your gap will show up here.',
    needDue: 'Add the date the money is due in Step 1, and we can work out your gap.',
    fundedHeading: 'You’re funded',
    fundedBody: 'What’s in your hand and what you’ll save cover the whole cost. That’s worth celebrating. On to Step 6 to set it up.',
    faithHeading: 'This is your faith gap',
    faithBody: 'You’ve done your part, so pray over this number with confidence. God often provides through people: Philippians 4:19 was written to a church that had just given to Paul’s mission.',
    faithVerse: { text: 'And my God will meet all your needs according to the riches of his glory in Christ Jesus.', ref: 'Philippians 4:19' },
    coverage: {
      heading: 'How the cost is covered',
      inHand: 'In hand',
      saving: 'Your saving',
      gap: 'The gap'
    },
    partnerHeading: 'Invite others to partner',
    partnerBody: 'Give people the whole picture: what it costs, what you’ve put in, what you’re saving each month, and the gap. It’s an invitation to partner, not a request to be rescued.',
    partnerFigures: {
      A: 'Total cost',
      B: 'What I’ve put in',
      E: 'What I’m saving each month',
      G: 'The gap I’m inviting you to share'
    },
    peopleHeading: 'Up to 5 people I could invite',
    personLabel: 'Person {n}',
    personPlaceholder: 'Name',
    pageHeading: 'Your Partner with me page',
    pageIntro: 'One page to share with your church or supporters. Add a short note and download it.',
    name: { label: 'Your first name', hint: 'Goes at the bottom of the page.' },
    note: {
      label: 'A short personal note',
      hint: 'Why you’re going, and what you’d love people to do: pray, give, or both. A few sentences is plenty.'
    },
    tooBig: 'If the gap is too big for the time left, talk it through with your programme leader and pastor. And don’t put the trip on a credit card.',
    hebrews: { text: 'Now faith is the substance of things hoped for, the evidence of things not seen.', ref: 'Hebrews 11:1 (NKJV)' }
  },

  /* Step 6 */
  setup: {
    title: 'Set it up this week',
    intro: 'Tick these off as you do them. Your ticks are saved with your plan.',
    items: [
      { id: 'pot', text: 'Open a separate savings pot just for the mission.' },
      { id: 'standing', text: 'Set up a standing order for {E} on payday.', noFigure: 'Set up a standing order for your new monthly margin on payday.' },
      { id: 'app', text: 'Put your income and spending into the Money in Motion app.', link: 'Open the app' },
      { id: 'pray', text: 'Write your gap down ({G}) and start praying over it.', noFigure: 'Write your gap down and start praying over it.' },
      { id: 'friend', text: 'Ask a trusted friend to check in with you monthly.' }
    ],
    closing: 'The mission doesn’t start when you get on the plane. It starts when you say yes to God.',
    startAgain: 'Start again'
  },

  keep: {
    heading: 'Keep your plan',
    body: 'Your Mission Cost Plan has all six steps, your figures from A to G and this week’s list.',
    partnerBody: 'The Partner with me page is a single sheet to share with your church or supporters.',
    planButton: 'Download my Mission Cost Plan (PDF)',
    partnerButton: 'Download my Partner with me page (PDF)',
    working: 'Making your PDF…',
    done: 'Your PDF has downloaded.',
    printed: 'Your browser couldn’t make the PDF, so the print window opened instead. Choose “Save as PDF” there.'
  },

  email: {
    heading: 'Want some help sticking with it?',
    intro: 'Months of saving takes staying power. Pop your email in for the occasional email from Money in Motion. Your plan and PDFs work either way.',
    button: 'Sign me up'
  },

  pdf: {
    eyebrow: 'Saving for Mission',
    plan: {
      filename: 'my-mission-cost-plan.pdf',
      title: 'My Mission Cost Plan',
      where: 'Where',
      away: 'Away',
      due: 'Money due',
      months: 'Months to save',
      notSet: 'Not set yet',
      nothing: 'Nothing added yet',
      savings: 'Savings',
      sold: 'Selling: {what}',
      promised: 'Gifts or sponsorship promised',
      debt: 'Debt check: talk to someone before putting money toward the trip. Free help:',
      invite: 'People I could invite',
      done: 'Done',
      app: 'Find your monthly margin and stick to your plan with the free Money in Motion app:'
    },
    partner: {
      filename: 'partner-with-me.pdf',
      title: 'Partner with me',
      when: 'When',
      due: 'Money needed by',
      from: 'Thank you,',
      thanks: 'Thank you.',
      thermo: 'How it’s coming together',
      inHand: 'In hand',
      saving: 'My saving by {date}',
      savingNoDate: 'My saving',
      gap: 'Still to find together',
      colourIn: 'Colour it in as gifts come in.'
    }
  },

  /*
   * The worked example ("See a worked example" on the first screen).
   * Dates are counted from the day someone opens it. Amounts are typed
   * as someone would type them. It should come out as:
   *   A £2,400  B £400  C £2,000  D £250  E £180  F £1,440  G £560
   * (the test in saving-for-mission/tests checks this).
   */
  example: {
    where: 'A summer mission team in Uganda',
    dueInMonths: 8,
    leaveInMonths: 9,
    backInMonths: 10,
    costs: {
      fee: '1,700',
      health: '200',
      insurance: '90',
      kit: '160',
      spending: '150',
      gifts: '40',
      airport: '60'
    },
    extraCosts: [],
    savings: '150',
    sell: [{ label: 'Old phone', amount: '250' }],
    promised: '',
    margin: '120',
    cuts: [
      { r: 'remove', label: 'Two streaming services', amount: '20' },
      { r: 'reduce', label: 'Takeaways (meal planning instead)', amount: '40' }
    ],
    income: [],
    people: ['My home group', 'Gran and Grandad', 'Aunt Jo', '', ''],
    name: 'Sam',
    note: 'This summer I’m joining a team from church to help run a holiday club alongside a local church in Uganda. I’ve put in what I can and I’m saving every month until the money is due. Would you pray for me, and would you think about helping with the gap?'
  }
};
