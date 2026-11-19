/*
 * Pay Yourself a Steady Wage: all the words.
 * Edit any text here. Keep the quote marks and commas.
 * Words in {curly brackets} are filled in by the planner, so leave those as they are.
 * Links live in /assets/config.js.
 */

window.MIM_WAGE_CONTENT = {

  intro: {
    eyebrow: 'Free tool · about 5 minutes',
    title: 'Pay Yourself a Steady Wage',
    lead: 'When your income goes up and down, which number do you budget on? Put in what landed over the last 12 months and you’ll get the answer: a steady wage to pay yourself every month.',
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
    starting: 'Just starting out, with little or nothing to put in yet?',
    startingLink: 'Start from what you need',
    needs: 'What you need each month',
    needsHint: 'With fewer than three months of income there isn’t enough to go on yet, so the planner starts from the other end. Put in what it takes to cover your needs and obligations: your bare-bones budget.',
    example: 'Load an example',
    exampleHint: 'Just want a look? See a plan built on a made-up year of lumpy income.',
    errors: {
      empty: 'Put in what landed each month, so the planner has something to work with.',
      missing: 'Add a figure for {months}. Put 0 if nothing came in.',
      invalid: 'One of these doesn’t look right. Use a number like 1250 or 1250.50.',
      needsRequired: 'Put in what you need each month, so the planner has a wage to start you on.',
      needsInvalid: 'That doesn’t look right. Use a number like 1800.',
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
    heading: 'Your holding pot',
    label: 'In your holding account today',
    hint: 'This is money waiting to pay your wage. Leave out anything put by for tax, and put 0 if you haven’t started a pot yet.',
    fund: 'I have a full emergency fund',
    fundHint: 'That’s Baby Step 3: three to six months of essential expenses, in easy reach. With that behind you, the pot can run leaner.',
    already: 'I already pay myself a set wage',
    wage: 'The wage you pay yourself now',
    wageHint: 'What goes to your current account each month. The planner will tell you whether to hold it, raise it or trim it.',
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

    /* The wage. This is the headline, so it says what the number is for. */
    start: {
      eyebrow: 'Your regular income',
      headline: 'Pay yourself {wage} a month',
      body: 'This is the number to build your budget on. It’s set at a quiet month rather than a good one, so you know you can meet your needs and obligations even in your leanest month. What you do with it is still up to you.'
    },
    starter: {
      eyebrow: 'Your starting wage',
      headline: 'Start on {wage} a month',
      body: 'With no track record yet, start from what you need. This covers your needs and obligations and nothing more, until three months of income give the planner something to go on. Build your budget on it in the meantime.'
    },
    set: {
      eyebrow: 'Your regular income',
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
      body: 'Up from {previous}. Your last 12 months support it, and your pot is still full at the new wage. Budget for it in the app like any other income. Not ready to count on it yet? Stay on {previous} and treat the extra as a good year.'
    },
    cut: {
      eyebrow: 'Your pay review',
      headline: 'Take a cut now: {wage} a month',
      body: 'Down from {previous}. Your pot holds less than a month of wages, and a small cut now saves a bigger one later.',
      bodyDeep: 'Down from {previous}. Your pot holds less than a month of wages, and {wage} is what your last 12 months support. It’s a hard one to take, but it keeps payday coming.'
    },
    afterTax: ' after tax and costs',

    notes: {
      partYear: 'This is built on {n} months, so treat it as a first guess. Seasonal dips only show up over a full year, and the figure gets sharper each time you come back.',
      fewPayments: 'Money landed in only {n} of your 12 months. With so few payments, one year isn’t much to go on, so check the pot every time one lands.',
      drift: 'A heads-up: your last 12 months would support {quiet}, which is less than you’re paying yourself. The pot can carry the difference for now. If work has really dropped off, cut to {quiet} now rather than waiting for the pot to run down.',
      driftPart: 'A heads-up: your first {n} months would support {quiet}, which is less than you’re paying yourself. The pot is carrying the difference, so keep an eye on how long it can.',
      belowNeeds: 'That’s less than the {needs} you said you need each month. A pot can cover the gap for a while, but it’s the work that has to close it.'
    },

    /* Where the number comes from, and the gap the pot has to cover. */
    chart: {
      heading: 'Your year against your wage',
      caption: 'The bars are what landed each month{afterTax}. The line is your wage: {total} for the year, divided by 15.',
      captionPart: 'The bars are what landed each month{afterTax}. The line is your wage: four-fifths of an average month.',
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

    /* Just starting out: no year to draw yet, so this card says how long the
       pot lasts and what has to come in. */
    runway: {
      heading: 'How long it lasts, and what it takes',
      covers: 'Your pot covers {months} of wages with nothing coming in.',
      month: '1 month',
      months: '{n} months',
      thin: 'Your pot doesn’t cover a full month’s wage yet, so pay yourself what’s there until it does.',
      empty: 'You’re starting with an empty pot, so your first wage comes out of your first payments.',
      seed: 'Redundancy money or savings set aside to get going? That’s your pot, so count it in the box above.',
      keepUp: 'To keep paying yourself {wage}, about {keepUp} a month has to land after tax and costs. That’s {keepUpYear} a year.',
      keepUpPlain: 'To keep paying yourself {wage}, about {keepUp} a month has to land. That’s {keepUpYear} a year.',
      takings: 'Before tax and costs come out, that’s about {takings} a month in takings.',
      back: 'Come back once three months of income have landed. Add them above, and the planner works your wage out from real figures.'
    },

    /* The pot: one number to aim for, and where they are today. */
    pot: {
      heading: 'The pot that keeps it steady',
      full: 'Full at',
      fullBody: 'That’s about {months} months of wages: enough to keep paying yourself through a stretch like your leanest one, and for another month if it runs long.',
      fullBodyFlat: 'That’s two months of wages. Every month covered your wage, so it’s all the cushion you need.',
      // With a full emergency fund behind it, the pot only covers the stretch itself.
      fullBodyFund: 'That’s about {months} months of wages: enough to keep paying yourself through a stretch like your leanest one. If one runs longer, that’s what your emergency fund is for.',
      fullBodyFlatFund: 'That’s one month of wages. Every month covered your wage, and your emergency fund is the cushion behind it.',
      // Just starting out: no leanest stretch to size it on yet.
      fullBodyStarter: 'That’s two months of wages, which is the least to aim for at first. Once you have a year of figures, the planner sizes it to your own leanest stretch.',
      fullBodyStarterFund: 'That’s one month of wages, with your emergency fund behind it. Once you have a year of figures, the planner sizes it to your own leanest stretch.',
      today: 'In the pot today',
      meter: 'Your pot holds {pot} of the {full} that makes it full.',
      toGo: '{amount} to go.',
      building: {
        body: 'You don’t need a full pot to start.',
        when: 'On a year like your last one, it would be full around {month}.',
        whenAverage: 'At your average month, it would be full around {month}.',
        shortOne: 'One payday on the way would come up short, which is normal while it fills.',
        shortMany: '{count} paydays on the way would come up short, which is normal while it fills.',
        never: 'On a year like your last one, the pot wouldn’t fill at this wage.'
      },
      steady: 'Your pot is full, so your wage is covered through a stretch like your leanest one.',
      steadyStarter: 'Your pot is past that already, which is a good place to start from.',
      over: 'Your pot is well past full. The {amount} over {top} is yours to use, and there are ideas further down.',
      season: 'Your leanest stretch started in {month}. Go into the next one with a full pot and it’s covered.'
    },

    /* What to do, in order. The last step hands over to the budget app. */
    plan: {
      heading: 'What to do now',
      steps: {
        account: {
          title: 'Open a holding account',
          body: 'Everything you earn lands here, every invoice and every cash job. Name it Payroll, so you never mistake it for spending money.'
        },
        before: {
          title: 'Move {percent}% out for tax and costs',
          body: 'Do it the day the money lands. Of every £1,000, {aside} goes to your tax pot and {keep} stays.'
        },
        after: {
          title: 'Leave what lands in the pot',
          body: 'Tax is already off, so it all stays. If you have any work costs to pay, move those out first.'
        },
        pay: {
          title: 'Pay yourself {wage} on the same day every month',
          building: 'Pick a day and stick to it. Until the pot is full, pay yourself {wage} or whatever the pot holds, if that’s less. Never more, however good the month has been.',
          full: 'Pick a day and set up a standing order, so it happens without you.'
        },
        budget: {
          title: 'Build your budget on {wage}',
          body: 'Put it into the free Money in Motion app as your monthly income. That’s Step 0 of the Baby Steps: get a budget, and tell every pound where to go before the month starts.',
          button: 'Get the app'
        }
      },
      set: 'Set {wage} as my wage',
      change: 'Change my wage to {wage}',
      setHint: 'The planner remembers it on this device. At your pay review in {month} it tells you whether to hold, rise or cut.',
      setDone: 'Saved on this device. Come back in {month} for your pay review.',
      next: 'Your next pay review is in {month}.'
    },

    /* How to think about it. Short, and in the order people meet them. */
    tips: {
      heading: 'Good months and lean months',
      items: [
        {
          title: 'A big payment isn’t payday.',
          body: 'It has to pay your wage next month and the month after, so leave it in the pot.'
        },
        {
          title: 'A lean month isn’t an emergency.',
          body: 'Your wage still goes out, because that’s what the pot is for. No need to touch your emergency fund or reach for a card.',
          // Shown instead when they've ticked that they have a full emergency fund.
          bodyFund: 'Your wage still goes out, because that’s what the pot is for. If a stretch runs longer than the pot can carry, that’s when to use your emergency fund. Pay it back before you count anything as extra.'
        },
        {
          title: 'Earning more, and it keeps coming?',
          body: 'Then it’s regular income. Give yourself a rise at your pay review and budget for it in the app, the same as the rest.'
        },
        {
          title: 'A good year you’re not ready to count on?',
          body: 'Keep your wage where it is. Anything in the pot over {top} is extra, so use it for things that can flex: a nicer holiday, an extra present for the kids at Christmas, a boost to a Junior ISA or your pension. Your monthly budget never depends on it.'
        },
        {
          title: 'Check in every three months.',
          body: 'In January, April, July and October, come back with the new months and what’s in the pot. The planner tells you whether to hold your wage, raise it or trim it.'
        }
      ],
      rulesHeading: 'How the planner decides',
      rules: [
        'Under {low} in the pot (one month of wages): take a cut now, before it has to be a big one.',
        'Your last 12 months support 10% more, and the pot would still be full: take a rise.',
        'Anything else: hold. One good month doesn’t change anything.',
        'Over {top} in the pot: the extra is good-year money.'
      ],
      faith: 'Proverbs 21:20 says the wise store up choice food and olive oil, but fools gulp theirs down. Store in the plenty, so the lean months don’t catch you.',
      benefits: 'On Universal Credit or other benefits? Money held in a pot can change what you get, so check with Citizens Advice before you build one up.'
    },

    keep: {
      heading: 'Keep your plan',
      body: 'One A4 page for the fridge: your wage, your pot, what to do when money lands, and your next four pay reviews with boxes to fill in.',
      name: 'Your name',
      nameHint: 'Goes at the top of the page.',
      button: 'Download my plan (PDF)',
      working: 'Making your PDF…',
      done: 'Your PDF has downloaded.',
      printed: 'Your browser couldn’t make the PDF, so the print window opened instead. Choose “Save as PDF” there.'
    },

    email: {
      heading: 'Stay in touch while you fill the pot',
      intro: 'Pop your email in and we’ll send a short welcome, then the Thursday email from Money in Motion each week. Your plan stays right here either way.',
      button: 'Sign me up'
    },

    share: {
      heading: 'Know someone whose income goes up and down?',
      message: 'This free tool works out a steady wage from an up-and-down income: {url}'
    },

    edit: 'Change my numbers',
    clear: 'Clear my data',
    cleared: 'Done. Your data has been cleared from this device.'
  },

  pdf: {
    filename: 'my-steady-wage-plan.pdf',
    eyebrow: 'Pay Yourself a Steady Wage',
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
    lands: 'What I do',
    landsIn: 'Everything I earn goes into the holding account.',
    landsBefore: 'I move {percent}% out for tax and costs, the day it lands.',
    landsAfter: 'Tax is already off, so it all stays in the pot.',
    landsPay: 'On payday, {wage} goes to my current account. A big payment isn’t payday.',
    landsBudget: 'My budget is built on {wage}. That’s my regular income.',
    starter: 'A starting wage, from what I need. I’ll work it out again once three months of income have landed.',
    reviews: 'My pay reviews',
    reviewsHint: 'Write in what the pot holds, then circle one. Under {low}: cut. Last 12 months support 10% more and the pot stays full: rise. Otherwise: hold.',
    potBlank: 'Pot',
    choices: 'Hold  ·  Rise  ·  Cut',
    goodYear: 'Over {top} in the pot? The extra is for things that can flex. My monthly budget never depends on it.',
    faith: 'Proverbs 21:20 says the wise store up choice food and olive oil, but fools gulp theirs down.',
    app: 'Budget on the wage in the free Money in Motion app'
  }
};
