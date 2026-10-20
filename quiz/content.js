/*
 * "Which Baby Step am I on?" quiz: all the words.
 * Edit any text here. Keep the quote marks and commas.
 * The option "value"s are used by the logic, so don't change those.
 * Step titles and the full ladder live in /assets/baby-steps.js.
 */

window.MIM_QUIZ_CONTENT = {

  intro: {
    eyebrow: 'Free quiz · about 2 minutes',
    title: 'Which Baby Step am I on?',
    lead: "Answer a few quick questions about where your money is right now. You'll find out which step you're on, and get three things to do this week.",
    points: [
      'One question at a time, and you can go back.',
      'Your answers stay on this device. We don’t store or see them.'
    ],
    start: 'Start the quiz',
    stepsSummary: 'What are the Baby Steps?',
    welcomeBackDone: 'Welcome back. Last time you came out on {step}.',
    welcomeBackPart: 'You got part of the way through last time.',
    seeResult: 'See my result',
    carryOn: 'Carry on',
    startAgain: 'Start again'
  },

  ui: {
    back: 'Back',
    questionCount: 'Question {n} of {total}',
    continue: 'Continue',
    cleared: 'Your answers have been cleared from this device.'
  },

  questions: {
    budget: {
      text: 'Do you have a budget you actually use each month?',
      help: ['A plan, on paper or in an app, that tells your money where to go before the month starts.'],
      options: [
        { value: 'yes', label: 'Yes, I use it every month' },
        { value: 'sortof', label: 'Sort of, it’s mostly in my head' },
        { value: 'no', label: 'No' }
      ]
    },
    starter: {
      text: 'Do you have at least £500 put aside for emergencies?',
      help: ['Money you could get at quickly if the boiler packed up. Not your pension, and not locked away in a fixed-term account.'],
      options: [
        { value: 'yes', label: 'Yes' },
        { value: 'no', label: 'Not yet' }
      ]
    },
    debt: {
      text: 'Do you have any consumer debt?',
      help: [
        'This counts: credit cards, personal loans, overdrafts, Buy Now Pay Later, car finance and money you owe to family.',
        'This doesn’t: your mortgage or student loans.'
      ],
      options: [
        { value: 'yes', label: 'Yes' },
        { value: 'no', label: 'No' }
      ]
    },
    debtSigns: {
      multi: true,
      text: 'Tick any that are true for you',
      help: ['This helps point you to the right next step. If none of them fit, just carry on.'],
      options: [
        { value: 'minimums', label: 'I only make the minimum payments' },
        { value: 'notFalling', label: 'My balances aren’t really going down' },
        { value: 'creditMonth', label: 'I use credit to get through a normal month' },
        { value: 'yearIncome', label: 'I owe close to, or more than, a year’s income' }
      ]
    },
    extraSavings: {
      text: 'Do you have more than £500 in savings?',
      help: ['Count everything you could get at easily, including the £500 for emergencies.'],
      options: [
        { value: 'yes', label: 'Yes' },
        { value: 'no', label: 'No' }
      ]
    },
    fullFund: {
      text: 'Do you have 3–6 months of essential expenses saved?',
      help: ['Essentials are the bills you’d still have to pay if your income stopped. Count savings you can get at easily.'],
      options: [
        { value: 'yes', label: 'Yes' },
        { value: 'no', label: 'Not yet' }
      ]
    },
    house: {
      text: 'Are you hoping to buy a home in the next few years?',
      help: ['Say yes if you’re still building up the deposit. Say no if you’re not planning to buy, or you’ve already got the deposit.'],
      options: [
        { value: 'yes', label: 'Yes, and I’m still saving the deposit' },
        { value: 'no', label: 'No' }
      ]
    },
    invest: {
      text: 'Are you putting around 15% of your income into pensions or investments?',
      help: ['Include your workplace pension, counting your employer’s part too. Your payslip or pension app should show the percentages.'],
      options: [
        { value: 'yes', label: 'Yes, about 15% or more' },
        { value: 'less', label: 'Less than that' },
        { value: 'unsure', label: 'I’m not sure' }
      ]
    },
    children: {
      text: 'Do you have children?',
      help: [],
      options: [
        { value: 'yes', label: 'Yes' },
        { value: 'no', label: 'No' }
      ]
    },
    launchFund: {
      text: 'Are you saving towards their launch fund?',
      help: ['A launch fund helps them into adult life: uni, a house deposit, a first car, whatever gets them going.'],
      options: [
        { value: 'yes', label: 'Yes' },
        { value: 'notYet', label: 'Not yet' },
        { value: 'launched', label: 'They’re grown up and already launched' }
      ]
    },
    mortgage: {
      text: 'Do you have a mortgage?',
      help: ['Say no if you rent, or you’ve already paid it off.'],
      options: [
        { value: 'yes', label: 'Yes' },
        { value: 'no', label: 'No' }
      ]
    },
    studentLoan: {
      text: 'Do you have a student loan?',
      help: [],
      options: [
        { value: 'yes', label: 'Yes' },
        { value: 'no', label: 'No' }
      ]
    },
    giving: {
      text: 'Do you give regularly?',
      help: ['To your church, a charity, or people in need. Any amount counts.'],
      options: [
        { value: 'yes', label: 'Yes' },
        { value: 'no', label: 'Not at the moment' }
      ]
    }
  },

  /*
   * One entry per step someone can land on.
   *   meaning  2–3 sentences
   *   actions  exactly three things to do this week
   *   faith    at most one short line, or null. Never the opening line.
   * Step 2 also has moveSavingsAction: it replaces the third action for
   * anyone with more than £500 saved while still in debt.
   */
  steps: {
    '0': {
      meaning: 'Every other step is built on this one. A budget tells every pound where to go before the month starts, so you’re deciding in advance instead of wondering where it all went. It doesn’t need to be clever, it just needs to be used.',
      actions: [
        'Open last month’s bank statement and add up what came in and what went out. No judging, just numbers.',
        'Before next month starts, give every pound a job: bills, food, giving, saving, debt payments. The budget builder in the free app walks you through it.',
        'Book a 15-minute check-in each week to see how it’s going. If you’re married, make it a joint meeting (biscuits help).'
      ],
      faith: 'Jesus talked about a builder who sits down first and estimates the cost (Luke 14:28). A budget is that, once a month.'
    },
    '1': {
      meaning: 'This is a small buffer between you and life’s surprises. With £500 in an easy-access account, a flat tyre or a broken washing machine doesn’t end up on a credit card. It’s a starter fund, so get it done quickly and move on.',
      actions: [
        'Open a separate easy-access savings account, or a savings pot in your banking app, and call it “Emergencies”.',
        'Find your first chunk this week. Sell something you don’t use, or pause a subscription, and pay it straight in.',
        'Decide now what counts as an emergency. The boiler, yes. A half-price sofa, no.'
      ],
      faith: 'Proverbs 21:20 says the wise store up choice food and olive oil. This £500 is the start of your store.'
    },
    '2': {
      meaning: 'Now you clear every consumer debt using the snowball. Pay the minimum on everything, then throw every spare pound at the smallest balance, and when that one’s gone, roll its payment onto the next. The mortgage and student loans wait.',
      actions: [
        'List every debt with its balance and minimum payment, then sort them from smallest balance to largest.',
        'Stop adding to them. Cut up the card, or take it off your phone and your favourite shopping sites.',
        'Find one extra amount this month, however small, and pay it off the smallest debt. The debt snowball tool in the free app shows when each one will be gone.'
      ],
      moveSavingsAction: 'Keep £500 for emergencies. Move everything above it onto the smallest debt this week, then roll on to the next.',
      faith: 'Proverbs 22:7 puts it bluntly: the borrower is slave to the lender. Each debt you clear hands a bit of that freedom back.'
    },
    '3': {
      meaning: 'With consumer debt gone, you build your emergency fund up to 3–6 months of essential expenses. That’s the money that turns a job loss or a big repair into an inconvenience instead of a crisis. Keep it somewhere you can get at easily, like a Cash ISA.',
      actions: [
        'Add up your essential monthly costs: housing, bills, food and getting to work. Multiply by three, then by six. That’s your target range.',
        'Take the money you were throwing at debt and point it at savings. You’re already used to living without it.',
        'Keep this money away from your everyday account, so it doesn’t quietly get spent.'
      ],
      faith: 'Proverbs 21:20 says the wise store up choice food and olive oil. This is your store cupboard, properly stocked.'
    },
    '3b': {
      meaning: 'You’re saving a house deposit, and the aim is 10% of the price. It comes after your full emergency fund, so a surprise bill doesn’t raid the deposit. If you qualify, a Lifetime ISA can help.',
      actions: [
        'Get a rough price for the kind of home you’re after and work out 10% of it. That’s your target.',
        'Check whether you qualify for a Lifetime ISA. If you do, read how it works before you open one.',
        'Set up a standing order for payday into a separate deposit account, so the money moves before you can spend it.'
      ],
      faith: 'The builder in Luke 14:28 sat down and estimated the cost before he started. Buying a house is the same sum, with more paperwork.'
    },
    '4': {
      meaning: 'Now you invest around 15% of your income for retirement. Start with your workplace pension and make sure you’re getting the full employer match, because that’s free money. After that, look at a SIPP, a Lifetime ISA or a Stocks & Shares ISA.',
      actions: [
        'Find out what goes into your pension now, from you and from your employer. Your payslip or your pension provider’s app will show it.',
        'Check how much your employer will match, and make sure you’re paying in enough to get all of it.',
        'Work out the gap to 15% and decide where the rest goes. If you’re unsure, a regulated financial adviser can help you choose.'
      ],
      faith: 'In the parable of the talents (Matthew 25:14–30), the servants who put their master’s money to work get the praise. Investing for later is part of that same faithfulness.'
    },
    '5': {
      meaning: 'Now you start a launch fund for your children. Think bigger than a uni fund: it’s for whatever launches them into adult life, whether that’s university, a first car, a house deposit or something nobody’s thought of yet. A Junior ISA does the job.',
      actions: [
        'Decide what you’d like the fund to help with, and roughly how much you can put in each month.',
        'Compare a few Junior ISA providers and open one for each child.',
        'Tell the grandparents it exists. Birthday money has to go somewhere.'
      ],
      faith: null
    },
    '6': {
      meaning: 'Everything else is in place, so now you go after the mortgage. Use the yearly overpayment allowance on your deal (it isn’t always 10%, so check with your lender), and add a lump sum when your fixed rate ends. Every pound you overpay is a pound the bank can’t charge interest on.',
      actions: [
        'Ask your lender three things: how much you can overpay each year, whether that’s measured on what you owe now or what you first borrowed, and when the year resets. Note the date your current deal ends too.',
        'Set up a regular monthly overpayment that keeps you inside your lender’s yearly allowance.',
        'Put the end date of your fix in your calendar, and start building a lump sum to pay in when it arrives.'
      ],
      faith: 'Proverbs 22:7 says the borrower is slave to the lender, and a mortgage is still borrowing. Picture the day the house is fully yours.'
    },
    '7': {
      meaning: 'You’ve done the hard yards, so now you keep building wealth and give generously. Generosity isn’t a reward you unlock at Step 7. It’s a habit from Step 1 that finally has room to grow.',
      actions: [
        'Sit down (with your spouse, if you’re married) and decide what you’d love to fund this year.',
        'If you’re a UK taxpayer, tick Gift Aid when you give to charity, so they can claim extra on your gift.',
        'Keep the budget and the investing going. Decide what “enough” looks like, so extra money has somewhere better to go than a bigger car.'
      ],
      faith: '2 Corinthians 9:6–8 talks about sowing generously, and says God loves a cheerful giver. This is the step where you get to enjoy that.'
    }
  },

  result: {
    youreOn: 'You’re on {step}',
    headingFor: 'Once that’s in place, you’re heading for {step}: {title}.',
    thisWeek: 'Three things to do this week',
    videoLink: 'Watch Jonathan explain {step}',
    videoComingSoon: 'Jonathan’s video on this step is coming soon.',
    app: {
      heading: 'The free Money in Motion app',
      body: 'It has a budget builder and a debt snowball tool, so you can put this week’s actions straight into practice.',
      ios: 'App Store',
      android: 'Google Play',
      web: 'Use it in your browser'
    },
    keep: {
      heading: 'Keep your plan',
      body: 'One page with your step, this week’s actions and the full ladder. Stick it on the fridge.',
      button: 'Download my Step plan (PDF)',
      working: 'Making your PDF…',
      done: 'Your PDF has downloaded.',
      printed: 'Your browser couldn’t make the PDF, so the print window opened instead. Choose “Save as PDF” there.'
    },
    email: {
      heading: 'Stay in touch while you work on {step}',
      intro: 'Pop your email in and we’ll send a short welcome, then the Thursday email from Money in Motion each week. Your result stays on screen either way.',
      button: 'Sign me up'
    },
    share: {
      heading: 'Know someone who’d find this useful?',
      message: 'I just did this 2-minute quiz from Money in Motion. It tells you which Baby Step you’re on and what to do this week: {url}'
    },
    ladder: {
      heading: 'Where you are on the steps',
      intro: 'The steps work in order, one at a time.',
      current: 'You’re here',
      done: 'Done',
      upcoming: 'Coming up',
      skipped: 'Doesn’t apply right now',
      extra: 'UK extra',
      extraRelevant: 'UK extra · applies to you'
    },
    moneyAndFaith: {
      text: 'Want to talk about money and faith with your church or small group?',
      link: 'Have a look at the Money & Faith course'
    },
    startAgain: 'Start again',
    clear: 'Clear my answers'
  },

  notes: {
    debtHelp: {
      heading: 'Before anything else, talk to someone',
      body: 'From your answers, your debt sounds like it’s putting real pressure on things. That’s more common than you’d think, and there’s free help. These charities give confidential debt advice and can look at options you might not know about.',
      after: 'The plan below still stands. Make the call first.'
    },
    studentLoan: {
      heading: 'A word on your student loan',
      body: 'In the UK, student loans behave more like a graduate tax than a normal debt, and most people won’t clear theirs before it’s written off. So it stays out of the snowball. Don’t overpay it unless you’re sure you’ll clear it in full.'
    },
    givingNo: {
      heading: 'Generosity can start now',
      body: 'You don’t need to wait until you reach a certain step. Start at any amount, even a few pounds a month, and let it grow with you.'
    },
    givingYes: 'You’re already giving. Keep that habit going: it grows with you through every step.'
  },

  pdf: {
    filename: 'my-baby-step-plan.pdf',
    eyebrow: 'Which Baby Step am I on?',
    thisWeek: 'This week',
    ladder: 'The steps',
    debtHelp: 'Free, confidential debt advice:',
    video: 'Watch Jonathan explain this step:',
    app: 'The free Money in Motion app has a budget builder and a debt snowball tool.'
  }
};
