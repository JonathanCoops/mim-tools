/*
 * Steady Wage Planner: all the words.
 * Edit any text here. Keep the quote marks and commas.
 * Words in {curly brackets} are filled in by the planner, so leave those as they are.
 * Links live in /assets/config.js.
 */

window.MIM_WAGE_CONTENT = {

  intro: {
    eyebrow: 'Free tool · about 5 minutes',
    title: 'Steady Wage Planner',
    lead: 'For income that goes up and down. Put in what landed over the last 12 months and see the steady wage you can pay yourself, and the size of pot that keeps it steady.',
    privacy: 'Your numbers are saved on this device only, so you can come back to them. We don’t store or see them.'
  },

  how: {
    heading: 'How it works',
    who: 'Self-employed, on commission, zero-hours or seasonal: if what you earn changes from month to month, this is for you.',
    steps: [
      'Everything you earn lands in a holding account, separate from the one you spend from.',
      'Tax and costs come out of it first.',
      'You pay yourself the same wage, on the same day, every month.'
    ],
    after: 'A good month fills the pot and a lean month draws it down. Your budget only ever sees the wage.'
  },

  income: {
    heading: 'What landed',
    intro: 'Put in what came into your account each month. Your bank statements have it, and round numbers are fine.',
    zero: 'Put 0 for any month when nothing came in.',
    month: '{month} {year}',
    partYear: 'I started less than a year ago',
    partYearHint: 'Leave the months before you started blank.',
    example: 'Load an example',
    exampleHint: 'Just want a look? See a plan built on a made-up year of lumpy income.',
    errors: {
      empty: 'Put in what landed each month, so the planner has something to work with.',
      missing: 'Add a figure for {months}. Put 0 if nothing came in.',
      invalid: 'One of these doesn’t look right. Use a number like 1250 or 1250.50.',
      tooFew: 'The planner needs at least {min} months to go on. Come back when you have them.',
      tooLow: 'There isn’t enough coming in here to work out a wage. Have a look at the figures above.'
    }
  },

  tax: {
    heading: 'Tax and costs',
    legend: 'Has tax already come off those figures?',
    after: 'Yes, tax is already off',
    afterHint: 'You’re paid through PAYE, or you’ve put in what was left after tax and costs.',
    before: 'No, tax and costs still have to come out',
    beforeHint: 'You’re self-employed and those are your takings.',
    setAside: 'Share you set aside for tax and costs',
    setAsideHint: 'Use your own figure. Not sure? Add last year’s tax bill to your business costs, then divide by everything that came in. Your tax return or your accountant will have both numbers.',
    hmrc: 'HMRC’s calculator will estimate the tax part',
    errors: {
      required: 'Pick one, so the planner knows whether to take tax off.',
      setAsideRequired: 'Put in the share you set aside, as a number.',
      setAsideInvalid: 'That doesn’t look right. Use a number between 0 and {max}.'
    }
  },

  pot: {
    heading: 'Your pot',
    label: 'In your holding account today',
    hint: 'This is money waiting to pay your wage. Leave out anything put by for tax, and put 0 if you haven’t started a pot yet.',
    wage: 'The wage you pay yourself now',
    wageHint: 'Only fill this in if you already pay yourself a set amount each month. Leave it blank and the planner works one out.',
    optional: '(optional)',
    errors: {
      pot: 'That doesn’t look right. Use a number like 2500, or 0.',
      wage: 'That doesn’t look right. Use a number like 1800, or leave it blank.'
    }
  },

  show: 'Show my plan',
  welcomeBack: 'Welcome back. Add the months since you were last here, update what’s in the pot, and your plan comes back.',
  fixAbove: 'Have a look at the boxes marked above.',
  updated: 'Plan updated: {headline}.',

  example: {
    // Made-up takings for a year, oldest month first, with a quarter set
    // aside for tax and costs. Just to show how a plan comes together.
    months: ['3200', '5600', '0', '1800', '4200', '6400', '800', '0', '5200', '2400', '4800', '3600'],
    tax: 'before',
    setAside: '25',
    pot: '2500',
    note: 'You’re looking at a made-up example. Swap in your own figures above and the plan updates as you go.'
  },

  results: {
    start: {
      eyebrow: 'Your steady wage',
      headline: 'Pay yourself {wage} a month',
      body: 'The same amount, on the same day, every month. It comes from what landed in your last 12 months{afterTax} ({total}), divided by 15. That’s a quiet month rather than a good one, so it’s a wage you can keep paying when work is thin.',
      bodyPart: 'The same amount, on the same day, every month. It’s four-fifths of an average month across the {n} months you’ve given{afterTax}. That’s a quiet month rather than a good one, so it’s a wage you can keep paying when work is thin.'
    },
    set: {
      eyebrow: 'Your steady wage',
      headline: 'You’re on {wage} a month',
      body: 'You set this in {since}. Leave it alone until your pay review in {review}, whatever lands in between.'
    },
    hold: {
      eyebrow: 'Your pay review',
      headline: 'Hold at {wage} a month',
      body: 'Your pot is doing its job, so nothing changes this time.'
    },
    rise: {
      eyebrow: 'Your pay review',
      headline: 'Give yourself a rise: {wage} a month',
      body: 'Up from {previous}. Your last 12 months support it, and your pot is still full at the new wage. Call HR.'
    },
    cut: {
      eyebrow: 'Your pay review',
      headline: 'Take a cut now: {wage} a month',
      body: 'Down from {previous}. Your pot holds less than two months of wages, and a small cut now saves a bigger one later.',
      bodyDeep: 'Down from {previous}. Your pot holds less than two months of wages, and {wage} is what your last 12 months support. It’s a hard one to take, but it keeps payday coming.'
    },
    afterTax: ' after tax and costs',

    notes: {
      partYear: 'This is built on {n} months, so treat it as a first guess. Seasonal dips only show up over a full year, and the figure gets sharper each time you come back.',
      fewPayments: 'Money landed in only {n} of your 12 months. With so few payments, one year isn’t much to go on, so check the pot every time one lands.',
      drift: 'A heads-up: your last 12 months would support {quiet}, which is less than you’re paying yourself. The pot can carry the difference for now. If it keeps draining, expect a cut at your next review.'
    },

    chart: {
      heading: 'Your year, levelled',
      caption: 'The bars are what landed each month{afterTax}. The line is your wage.',
      wage: 'Your wage: {wage}',
      covered: 'Covered your wage',
      under: 'Came in under',
      shortNone: 'Every month covered your wage.',
      shortOne: '1 month out of {n} came in under your wage.',
      shortMany: '{count} months out of {n} came in under your wage.',
      lean: 'Your leanest stretch was {from} to {to}, which fell {shortfall} short of your wage in total. That gap is what the pot is for.',
      leanOne: 'Your leanest month was {from}, which fell {shortfall} short of your wage. That gap is what the pot is for.',
      summary: 'Chart: what landed in each of the last {n} months, against a steady wage of {wage}. {short}',
      table: 'See the numbers',
      colMonth: 'Month',
      colLanded: 'Landed',
      colNet: 'After tax and costs',
      colPot: 'Pot after payday',
      tableNote: 'The last column starts the year with a full pot of {full}, pays your wage on the 1st, then adds what landed.'
    },

    pot: {
      heading: 'Your holding pot',
      intro: 'The pot is what keeps the wage steady. Three lines on it matter.',
      full: 'Full',
      fullBody: 'About {months} months of wages. That’s enough to get through a stretch like your leanest one without dropping under the low line.',
      fullBodyFlat: 'Three months of wages. No month fell short of your wage, so that’s all the cushion you need.',
      low: 'Low',
      lowBody: 'Two months of wages. If the pot is under this at a pay review, take a cut.',
      top: 'Good-year money',
      topBody: 'Anything over this is yours to use.',
      topValue: 'over {amount}',
      today: 'In the pot today',
      meter: 'Your pot holds {pot} of the {full} that makes it full.',
      toGo: '{amount} to go until it’s full.',
      building: {
        heading: 'Start now, and fill it as you go',
        body: 'On payday, pay yourself {wage}, or whatever is in the pot if it holds less. Never more, however good the month has been. That’s what fills it.',
        when: 'On a year like your last one, the pot would be full around {month}.',
        whenAverage: 'At your average month, the pot would be full around {month}.',
        shortOne: 'One payday on the way would come up short, which is normal while it fills.',
        shortMany: '{count} paydays on the way would come up short, which is normal while it fills.',
        never: 'On a year like your last one, the pot wouldn’t fill at this wage.',
        underLow: 'If the pot is still under {low} at your first pay review, the planner will suggest a slightly lower wage until it’s there.',
        faster: 'A tax refund or one big job is the quickest way to fill it.'
      },
      steady: {
        heading: 'Your pot is full',
        body: 'Set up a standing order for {wage} on the same day every month, and let it run.'
      },
      over: {
        heading: 'You have good-year money',
        body: 'Your pot is {amount} over the top line. Set up the standing order for {wage} if you haven’t already, then see your pay review below for what to do with the extra.'
      },
      season: 'Your leanest stretch started in {month}. Go into the next one with a full pot and it’s covered.'
    },

    lands: {
      heading: 'When money lands',
      steps: {
        in: {
          title: 'It all goes into the holding account',
          body: 'Every invoice and every cash job, big or small. Name the account Payroll, so you never mistake it for spending money.'
        },
        before: {
          title: 'Move {percent}% out for tax and costs',
          body: 'Do it the day the money lands. Of every £1,000, {aside} goes to your tax pot and {keep} stays.'
        },
        after: {
          title: 'Tax is already off, so it all stays',
          body: 'If you have any work costs to pay, move those out first.'
        },
        pay: {
          title: 'On payday, {wage} goes to your current account',
          body: 'Pick a day and stick to it. The 1st is easy to remember. That’s payday. A big payment isn’t.'
        }
      },
      faith: 'Proverbs 21:20 says the wise store up choice food and olive oil, but fools gulp theirs down. So when the big payment lands, leave it in the pot.'
    },

    review: {
      heading: 'Your pay review',
      intro: 'Every three months, in January, April, July and October, come back here. Add the new months and what’s in the pot, and the planner tells you whether to hold, take a rise or take a cut.',
      rules: [
        'If the pot is under {low}, take a cut now, before it has to be a big one.',
        'If your last 12 months support 10% more and the pot would still be full, give yourself a rise.',
        'Otherwise, hold. A good month on its own doesn’t change anything.'
      ],
      goodYear: 'Once the pot is over {top}, the extra is good-year money. Put it towards the Baby Step you’re on, or spend some on things you’d happily go without in a leaner year. Your monthly budget never depends on it.',
      quiz: 'Not sure which Baby Step you’re on?',
      quizLink: 'Take the quiz',
      next: 'Your next pay review is in {month}.',
      set: 'Set {wage} as my wage',
      change: 'Change my wage to {wage}',
      setHint: 'The planner remembers it on this device, so at your next review it can tell you whether to hold, rise or cut.',
      setDone: 'Saved on this device. Come back in {month} for your pay review.',
      benefits: 'On Universal Credit or other benefits? Money held in a pot can change what you get, so check with Citizens Advice before you build one up.'
    },

    keep: {
      heading: 'Keep your plan',
      body: 'One A4 page for the fridge: your wage, your pot lines, what to do when money lands, and your next four pay reviews with boxes to fill in.',
      name: 'Your name',
      nameHint: 'Goes at the top of the page.',
      button: 'Download my plan (PDF)',
      working: 'Making your PDF…',
      done: 'Your PDF has downloaded.',
      printed: 'Your browser couldn’t make the PDF, so the print window opened instead. Choose “Save as PDF” there.'
    },

    app: {
      heading: 'Budget on the wage, not the lumps',
      body: 'Put {wage} into the free Money in Motion app as your monthly income and build your budget on that. The lumps stay in the pot. It’s on iPhone, Android and the web.',
      button: 'Get the app'
    },

    email: {
      heading: 'Stay in touch while you fill the pot',
      intro: 'Pop your email in and we’ll send a short welcome, then the Thursday email from Money in Motion each week. Your plan stays right here either way.',
      button: 'Sign me up'
    },

    share: {
      heading: 'Know someone whose income goes up and down?',
      message: 'This free planner works out a steady wage from an up-and-down income: {url}'
    },

    edit: 'Change my numbers',
    clear: 'Clear my data',
    cleared: 'Done. Your data has been cleared from this device.'
  },

  pdf: {
    filename: 'my-steady-wage-plan.pdf',
    eyebrow: 'Steady Wage Planner',
    title: 'My Steady Wage Plan',
    wage: 'My wage',
    perMonth: 'a month',
    payday: 'Paid on the',
    paydayAfter: 'of every month',
    from: 'From my holding account to my current account',
    lines: 'My pot',
    full: 'Full',
    low: 'Low (take a cut)',
    under: 'under {amount}',
    top: 'Good-year money',
    over: 'over {amount}',
    year: 'My last 12 months against my wage',
    yearPart: 'My last {n} months against my wage',
    lands: 'When money lands',
    landsIn: 'It all goes into the holding account.',
    landsBefore: 'I move {percent}% out for tax and costs, the day it lands.',
    landsAfter: 'Tax is already off, so it all stays in the pot.',
    landsPay: 'On payday, {wage} goes to my current account. A big payment isn’t payday.',
    reviews: 'My pay reviews',
    reviewsHint: 'Write in what the pot holds, then circle one. Under {low}: cut. Last 12 months support 10% more and the pot stays full: rise. Otherwise: hold.',
    potBlank: 'Pot',
    choices: 'Hold  ·  Rise  ·  Cut',
    goodYear: 'Over {top} in the pot? The extra is good-year money.',
    faith: 'Proverbs 21:20 says the wise store up choice food and olive oil, but fools gulp theirs down.',
    app: 'Budget on the wage in the free Money in Motion app'
  }
};
