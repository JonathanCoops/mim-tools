/*
 * Debt Snowball Planner: all the words.
 * Edit any text here. Keep the quote marks and commas.
 * Words in {curly brackets} are filled in by the planner, so leave those as they are.
 * Links and the debt charities live in /assets/config.js.
 */

window.MIM_DEBT_CONTENT = {

  intro: {
    eyebrow: 'Free tool · about 5 minutes',
    title: 'Debt Snowball Planner',
    lead: 'List your debts and see the month you’ll be debt-free. Then download a one-page plan for the fridge.',
    privacy: 'Your numbers are saved on this device only, so you can come back to them. We don’t store or see them.'
  },

  counts: {
    heading: 'What counts',
    yes: 'Put in credit cards, loans, overdrafts, Buy Now Pay Later, car HP and money you owe to family.',
    no: 'Leave out your mortgage and student loans. Student loans behave more like a graduate tax than a normal debt.',
    pcp: 'Got PCP car finance? Treat it as a monthly bill in your budget, not snowball debt.'
  },

  debts: {
    heading: 'Your debts',
    intro: 'Add them one at a time, in any order. The planner sorts them for you.',
    empty: 'Nothing added yet.',
    example: 'Load an example',
    exampleHint: 'Just want a look? See how a plan comes together with four made-up debts.',
    addHeading: 'Add a debt',
    editHeading: 'Edit {name}',
    name: 'Name',
    namePlaceholder: 'e.g. Barclaycard',
    balance: 'Balance',
    balanceHint: 'What you owe today.',
    minimum: 'Minimum monthly payment',
    minimumHint: 'Put 0 if there isn’t one.',
    apr: 'Interest rate (APR)',
    aprHint: 'It’s on your statement. Leave it blank if you’re not sure.',
    optional: '(optional)',
    add: 'Add this debt',
    save: 'Save changes',
    cancel: 'Cancel',
    edit: 'Edit',
    remove: 'Remove',
    perMonth: '{amount} a month',
    rate: '{rate}% APR',
    noRate: 'no rate given',
    added: 'Added {name}. Add another, or show your plan.',
    saved: 'Saved the changes to {name}.',
    removed: 'Removed {name}.',
    full: 'That’s the most this planner can hold ({max}). If you have more debts than that, one of the free debt charities below can help you see the whole picture.',
    errors: {
      name: 'Give it a name, so you know which one it is.',
      balanceRequired: 'Put in what you owe, for example 1250.',
      balanceInvalid: 'That balance doesn’t look right. Use a number like 1250 or 1250.50.',
      minimumRequired: 'Put in the minimum payment, or 0 if there isn’t one.',
      minimumInvalid: 'That payment doesn’t look right. Use a number like 45.',
      aprInvalid: 'That rate doesn’t look right. Use a number like 22.9, or leave it blank.',
      fixAbove: 'Have a look at the boxes marked above.'
    }
  },

  extra: {
    label: 'Extra I can put towards debt each month',
    hint: 'On top of the minimums. Even a small amount builds momentum and brings your debt-free date closer.',
    invalid: 'That doesn’t look right. Use a number like 50, or 0.'
  },

  signs: {
    heading: 'Tick any that are true for you',
    help: 'This helps point you to the right help. If none fit, leave them blank.',
    // The same four as the quiz, word for word.
    options: [
      { value: 'minimums', label: 'I only make the minimum payments' },
      { value: 'notFalling', label: 'My balances aren’t really going down' },
      { value: 'creditMonth', label: 'I use credit to get through a normal month' },
      { value: 'yearIncome', label: 'I owe close to, or more than, a year’s income' }
    ]
  },

  show: 'Show my plan',
  needDebt: 'Add at least one debt first.',
  updated: 'Plan updated: {headline}.',

  example: {
    extra: '100',
    // Made-up numbers, just to show how a plan comes together.
    debts: [
      { name: 'Credit card', balance: '2300', minimum: '69', apr: '22.9' },
      { name: 'Car HP', balance: '5800', minimum: '210', apr: '8.9' },
      { name: 'Buy Now Pay Later', balance: '240', minimum: '80', apr: '0' },
      { name: 'Overdraft', balance: '900', minimum: '40', apr: '39.9' }
    ],
    note: 'You’re looking at the example. Swap in your own debts above and the plan updates as you go.'
  },

  results: {
    eyebrow: 'Your plan',
    debtFreeBy: 'Debt-free by {date}',
    nextMonth: 'That’s next month, counting from your {start} payments.',
    monthsAway: 'That’s {months} from now, counting from your {start} payments.',
    month: '1 month',
    months: '{n} months',
    year: '1 year',
    years: '{n} years',
    yearsAndMonths: '{years} and {months}',
    budget: 'You’ll put {amount} a month towards debt: all your minimums plus your extra.',
    notFinished: {
      title: 'Not within 50 years at these payments',
      body: 'We stopped counting at 50 years. At these payments the interest is keeping up with you, and that’s a reason to get some free help. It isn’t a verdict on you.'
    },
    noBudgetTitle: 'Nothing going towards debt yet',
    noBudget: 'Add a minimum payment or an extra amount, so the plan has something to work with.',

    growing: 'A heads-up about {name}: the minimum of {minimum} doesn’t cover the interest it adds each month (about {interest}), so on minimums alone it keeps growing. The plan allows for that, and the snowball clears it when its turn comes.',
    growingStuck: 'A heads-up about {name}: the minimum of {minimum} doesn’t cover the interest it adds each month (about {interest}), so on minimums alone it keeps growing.',

    order: {
      heading: 'Your snowball, in order',
      why: 'Smallest balance first, whatever the interest rate. Quick wins keep you going, and behaviour beats maths.',
      startHere: 'Start here',
      clears: 'Clears {date}',
      notCleared: 'Not cleared within 50 years',
      roll: 'Then {amount} a month rolls onto {name}.',
      last: 'The last one. After this, you’re debt-free.',
      early: 'Its own payments clear it before its turn comes.'
    },

    interest: {
      label: 'Total interest along the way',
      some: 'Counting only the debts where you gave a rate.',
      none: 'Add interest rates to see how much interest you’ll pay. Without them, the dates assume 0%, so the real ones may be a little later.'
    },

    chart: {
      heading: 'Watch it fall',
      caption: 'Total debt left at the end of each month. The dots are the months a debt clears.',
      label: 'Total debt left',
      withMore: 'With {amount} more a month',
      cleared: '{name} cleared',
      summary: 'Chart: your total debt falls from {start} today to £0 in {date}.',
      summaryUnfinished: 'Chart: your total debt over the next 50 years, starting at {start} today.',
      failed: 'The chart couldn’t load here, but the numbers below tell the same story.',
      table: 'See the numbers',
      tableMonth: 'Month',
      tableLeft: 'Still owed',
      today: 'Today'
    },

    whatIf: {
      heading: 'What if I found a bit more?',
      intro: 'Tap an amount to see the difference.',
      button: '{amount} more',
      sooner: 'With {amount} more a month, you’d be debt-free by {date}: {saved} sooner.',
      interestSaved: 'You’d also pay about {interest} less interest.',
      same: 'With {amount} more a month, your debt-free month stays the same.',
      nowFinishes: 'With {amount} more a month, you’d be debt-free by {date}.',
      stillNot: 'Even with {amount} more a month, it doesn’t finish within 50 years. One of the free debt charities can help you look at other options.'
    },

    faith: 'Proverbs 22:7 says the borrower is slave to the lender. Every debt on this list you clear hands a bit of that freedom back.',

    help: {
      heading: 'Before you start, talk to someone',
      body: 'From what you’ve ticked, your debt sounds like it’s putting real pressure on things. That’s more common than you’d think, and there’s free help. These charities are free and confidential, and they can look at options a snowball can’t.',
      bodyUnfinished: 'At these payments your debts won’t clear within 50 years. That’s a lot to carry on your own, and you don’t have to. These charities are free and confidential, and they can look at options a snowball can’t.',
      after: 'Your plan below still stands. Make the call first.'
    },

    keep: {
      heading: 'Keep your plan',
      body: 'One A4 page for the fridge: your debt-free date, your debts in order with boxes to colour in, and a monthly check-in.',
      name: 'Your name',
      nameHint: 'Goes at the top of the page.',
      button: 'Download my plan (PDF)',
      working: 'Making your PDF…',
      done: 'Your PDF has downloaded.',
      printed: 'Your browser couldn’t make the PDF, so the print window opened instead. Choose “Save as PDF” there.'
    },

    app: {
      heading: 'Track it in the free Money in Motion app',
      body: 'It has a budget builder and a debt snowball tool, so your plan can go everywhere you do.',
      ios: 'App Store',
      android: 'Google Play',
      web: 'Use it in your browser'
    },

    email: {
      heading: 'Stay in touch while you pay this off',
      intro: 'Pop your email in and we’ll send a short welcome, then the Thursday email from Money in Motion each week. Your plan stays right here either way.',
      button: 'Sign me up'
    },

    edit: 'Change my debts',
    clear: 'Clear my data',
    cleared: 'Done. Your data has been cleared from this device.'
  },

  pdf: {
    filename: 'my-debt-free-plan.pdf',
    eyebrow: 'Debt Snowball Planner',
    title: 'My Debt-Free Plan',
    debtFreeBy: 'Debt-free by',
    notFinished: 'Not within 50 years at these payments',
    perMonth: '{amount} a month towards debt',
    starting: 'Starting {start}',
    interest: 'About {amount} in interest along the way',
    order: 'My debts, smallest first',
    boxesHint: 'Colour in a box for every tenth you pay off. Tick the debt when it’s gone.',
    perBox: '{amount} a box',
    clears: 'Clears {date}',
    notCleared: 'Not within 50 years',
    checkIn: 'Paid this month',
    checkInHint: 'Tick each month you make every payment on the plan.',
    debtFree: 'Debt-free',
    pledge: 'I’m doing this.',
    signed: 'Signed',
    date: 'Date',
    partner: 'Accountability partner',
    partnerHint: 'someone who’ll ask how it’s going',
    help: 'Free, confidential debt advice:',
    faith: 'Proverbs 22:7 says the borrower is slave to the lender. Every box you colour in buys a little freedom back.',
    app: 'Track it in the free Money in Motion app'
  }
};
