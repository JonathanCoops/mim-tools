/*
 * Christmas Without Debt: all the words.
 * Edit any text here. Keep the quote marks and commas.
 * The ids (weekly, partner, food, lower, light ...) are used by logic.js,
 * so don't change those. Words in {curly brackets} are filled in with the
 * person's own figures.
 *
 * Bible verses are NIV.
 */

window.MIM_CHRISTMAS_CONTENT = {

  intro: {
    eyebrow: 'Free tool · about 10 minutes',
    title: 'Christmas Without Debt',
    lead: 'Already worried about paying for Christmas? Let’s plan it around your paydays, so it’s paid for in cash before it arrives.',
    // The one statistic this tool uses. Please don't add others.
    stat: 'In a YouGov survey, about 1 in 5 UK adults borrowed to pay for Christmas 2025.',
    statAfter: 'If that was you last year, you’re in good company. This year can look different, and it doesn’t have to be a smaller Christmas to be a lovely one.',
    points: [
      'Five short steps, with your total adding up as you go.',
      'Everything stays on this device. We don’t store or see it, and the names on your list never leave it.'
    ],
    start: 'Plan my Christmas',
    welcomeBack: 'Welcome back. Your Christmas plan is saved on this device.',
    newYear: 'Your saved plan was for Christmas {old}. Carry on and it becomes your plan for {year}, with last year’s ticks cleared.',
    carryOn: 'Carry on',
    startAgain: 'Start again',
    startAgainConfirm: 'Start again? This clears everything you’ve typed from this device.'
  },

  ui: {
    stepCount: 'Step {n} of 5',
    back: 'Back',
    next: 'Next: {title}',
    toStart: 'Back to the start',
    goTo: 'Go to step {n}',
    saved: 'Your plan saves as you go, on this device only.',
    clear: 'Clear my data',
    clearConfirm: 'Clear everything you’ve typed from this device?',
    clearYes: 'Yes, clear it',
    clearNo: 'Keep it',
    cleared: 'Done. Your data has been cleared from this device.',
    notANumber: 'Numbers only, like 25',
    noMinus: 'No minus figures here',
    optional: '(optional)',
    remove: 'Remove {what}',
    removeButton: 'Remove',
    edit: 'Edit',
    week: 'week',
    weeks: 'weeks',
    day: 'day',
    days: 'days',
    payday: 'payday',
    paydays: 'paydays'
  },

  // The running total, at the top of every step.
  summary: {
    label: 'Your Christmas so far',
    cost: 'Christmas costs',
    have: 'You’ll have',
    short: 'Short by',
    spare: 'To spare',
    even: 'Balanced',
    gap: 'Gap'
  },

  stepNames: ['When and how you’ll save', 'Who you’re buying for', 'Everything else', 'Can you afford it?', 'Your plan'],

  /* Step 1 */
  when: {
    title: 'When and how you’ll save',
    intro: 'First the calendar, then what you’ve got and what you can put by.',
    today: 'Today is {today}.',
    christmas: 'Christmas Day is {date}.',
    countdownLabel: 'to Christmas',
    countdown: '{weeks} and {days}',
    christmasDay: 'It’s Christmas Day. Have a lovely one. Your plan for next Christmas starts tomorrow.',
    frequency: {
      legend: 'How often are you paid?',
      hint: 'On Universal Credit, a pension or paid at odd times? Pick the closest, and use the day money next comes in.',
      options: [
        { id: 'weekly', label: 'Every week' },
        { id: 'fortnightly', label: 'Every two weeks' },
        { id: 'fourWeekly', label: 'Every four weeks' },
        { id: 'monthly', label: 'Once a month' }
      ],
      periods: { weekly: 'week', fortnightly: 'fortnight', fourWeekly: 'four weeks', monthly: 'month' }
    },
    next: { label: 'When’s your next payday?' },
    status: {
      none: 'Add how often you’re paid and your next payday, and we’ll count the paydays before Christmas.',
      ok: 'That’s {count} before Christmas: {dates}.',
      one: 'That’s one payday before Christmas: {dates}.',
      zero: 'Your next payday is after {cutoff}, so there’s no payday left to save from before Christmas. That’s all right: what you’ve already saved and the ideas in step 4 can do the work.',
      rolled: 'That date has gone, so we’ve counted on from {date}.',
      far: 'That’s more than a {period} away. Worth a second look.',
      cutoff: 'We stop counting at {cutoff}, so the money is there in time for the last shop.',
      lateDecember: 'Your {date} pay isn’t counted, even if it comes early. It has to carry you through to the payday after.'
    },
    saved: {
      label: 'What you’ve already saved for Christmas',
      hint: 'Put 0 if you’re starting from scratch. Plenty of people are.'
    },
    perPayday: {
      label: 'What you could put aside each payday',
      hint: 'From now until Christmas. £0 is fine for now, and you can come back to it.'
    },
    sumLabel: 'By {cutoff} you’ll have',
    sumBreakdown: '{saved} saved + {amount} × {count}'
  },

  /* Step 2 */
  people: {
    title: 'Who you’re buying for',
    intro: 'Add people one at a time. A rough budget is fine, and you can change it later.',
    chipsLabel: 'Quick add',
    chips: [
      { relation: 'partner', label: 'Partner', name: 'My partner' },
      { relation: 'child', label: 'A child', name: 'Child {n}' },
      { relation: 'parent', label: 'Parent', name: 'Parent' },
      { relation: 'sibling', label: 'Brother or sister', name: 'Brother or sister' },
      { relation: 'grandparent', label: 'Grandparent', name: 'Grandparent' },
      { relation: 'friend', label: 'Friend', name: 'Friend' },
      { relation: 'teacher', label: 'Teacher', name: 'Teacher' },
      { relation: 'santa', label: 'Secret Santa', name: 'Secret Santa at work' },
      { relation: 'neighbour', label: 'Neighbours', name: 'Neighbours' }
    ],
    chipHint: 'A quick-add fills in the form below. Type over the name with the real one.',
    relations: {
      partner: 'Partner',
      child: 'A child',
      parent: 'Parent',
      sibling: 'Brother or sister',
      grandparent: 'Grandparent',
      family: 'Other grown-up family',
      friend: 'Friend',
      teacher: 'Teacher',
      santa: 'Secret Santa',
      neighbour: 'Neighbours',
      other: 'Someone else'
    },
    addHeading: 'Add someone',
    editHeading: 'Edit {name}',
    name: 'Name',
    namePlaceholder: 'e.g. Grandma',
    relation: 'Who are they?',
    relationHint: 'This helps with ideas like a family Secret Santa later on.',
    budget: 'Budget',
    idea: 'Gift idea',
    ideaPlaceholder: 'e.g. A good book',
    add: 'Add to my list',
    save: 'Save changes',
    cancel: 'Cancel',
    added: 'Added {name}. Add someone else, or carry on when you’re ready.',
    changed: 'Saved the changes to {name}.',
    removed: 'Removed {name}.',
    nameRequired: 'Add a name so you know who it’s for.',
    empty: 'No one on your list yet.',
    listLabel: 'Your list',
    noBudget: 'No budget yet',
    total: 'Gift total',
    full: 'That’s the most this list holds ({max}). Big family? A family Secret Santa in step 4 might be the kindest thing for everyone.',
    private: 'The names on your list stay on this device. They’re never sent anywhere.'
  },

  /* Step 3 */
  extras: {
    title: 'Everything else Christmas costs',
    intro: 'These are the costs that sneak up on people. Put a rough figure next to anything that applies, and skip the rest.',
    items: [
      { id: 'food', label: 'The Christmas food shop', hint: 'Plus the extra food and drink over the holidays' },
      { id: 'hosting', label: 'Hosting and visitors' },
      { id: 'travel', label: 'Travel to family', hint: 'Petrol, trains and parking' },
      { id: 'decorations', label: 'Decorations and the tree' },
      { id: 'cards', label: 'Cards and postage' },
      { id: 'wrapping', label: 'Wrapping', hint: 'Paper, tape, tags and gift bags' },
      { id: 'outfits', label: 'Outfits and Christmas jumpers' },
      { id: 'kids', label: 'Kids’ parties and school events', hint: 'Nativity costumes, Christmas jumper day, the class party' },
      { id: 'nights', label: 'Work do and nights out' },
      { id: 'daysout', label: 'Days out and the panto' },
      { id: 'giving', label: 'Charity and church giving at Christmas' }
    ],
    ownHeading: 'Anything else',
    ownIntro: 'Add your own lines for anything this list has missed.',
    ownPlaceholder: 'What is it?',
    ownLabel: 'Your own line {n}',
    ownAmountLabel: 'Cost of {what}',
    add: '+ Add a line',
    full: 'That’s the most this list holds.',
    tip: 'Tip: look at last December’s bank statement. It shows what Christmas really cost, rather than what you meant it to.',
    total: 'Everything else'
  },

  /* Step 4 */
  afford: {
    title: 'Can you afford it?',
    intro: 'Here’s the whole picture, and some kind ways to make it fit.',
    worried: {
      label: 'I’m already borrowing or behind on bills to get through normal months.',
      hint: 'Optional. Only you see this.'
    },
    care: {
      heading: 'Christmas doesn’t have to be paid for with debt',
      body: 'If normal months already need borrowing, please talk to someone before Christmas adds to it. CAP, StepChange and Citizens Advice give free, confidential help, and nothing you tell them will shock them.',
      local: 'A local foodbank or church may be able to help with Christmas food or presents too. Asking is wisdom, not failure.'
    },
    cost: 'Christmas will cost',
    costBreakdown: 'Gifts {gifts} + everything else {extras}',
    have: 'You’ll have by {cutoff}',
    haveBreakdown: '{saved} saved + {amount} × {count}',
    haveSaved: '{saved} already saved',
    short: 'You’re {amount} short',
    spare: 'You’ve {amount} to spare',
    even: 'It balances to the penny',
    needMore: 'To cover it, put aside {need} each payday. That’s {more} more than now.',
    needFromZero: 'To cover it, put aside {need} each payday.',
    noPaydays: 'With no paydays left before Christmas, the ideas below are where the gap closes.',
    needPayday: 'Add your payday in step 1 to see what to put aside each payday.',
    empty: 'Add who you’re buying for in step 2, or what else Christmas costs in step 3, and your totals show up here.',
    alreadyPaid: 'What you’ve already saved covers it.',

    waysHeading: 'Ways to close the gap',
    waysHeadingSpare: 'Ideas for a bit more breathing room',
    waysIntro: 'Switch any of these on and watch the total move. Switch them off again if they don’t suit.',
    familyNote: 'The family ideas are about the parents, brothers and sisters, grandparents and other grown-up family on your list.',
    saves: 'Saves {amount}',
    could: 'Could save {amount}',
    nothing: 'Nothing to save here yet',
    blockedBy: 'Presents for the children only already covers the grown-ups.',
    problems: {
      needPeople: 'Add people in step 2 to use this.',
      needGrownUps: 'Add two or more grown-ups from your family in step 2 to use this.',
      needGrownUp: 'Add a grown-up from your family in step 2 to use this.',
      needExtras: 'Add some costs in step 3 to use this.'
    },
    ways: {
      lower: {
        title: 'Lower someone’s budget',
        hint: 'Change any amount below. Nobody else needs to know.',
        newBudget: 'New budget for {name}',
        was: 'was {amount}'
      },
      secretSanta: {
        title: 'A family Secret Santa',
        hint: 'The grown-ups each buy one present for one person, instead of something for everyone.',
        amount: 'Spend on your one present'
      },
      cap: {
        title: 'A family spending cap',
        hint: 'Everyone agrees a limit on presents between the grown-ups.',
        amount: 'Limit per person'
      },
      childrenOnly: {
        title: 'Presents for the children only',
        hint: 'The grown-ups in the family agree to skip presents for each other.'
      },
      homemade: {
        title: 'Homemade presents, or gifts of time',
        hint: 'Baking, a framed photo, a day out together or an evening’s babysitting. Tick who’d love one.',
        materials: 'Set aside for materials, each',
        pick: 'Who gets something homemade?'
      },
      cutBack: {
        title: 'Cut back on one of the extras',
        hint: 'Pick one line and give it a lower figure.',
        line: 'Which one?',
        choose: 'Choose a line',
        amount: 'New amount'
      }
    },
    celebrate: {
      heading: 'That’s Christmas covered',
      body: 'It adds up, with nothing borrowed. Your plan is ready on the next step.'
    }
  },

  /* Step 5 */
  plan: {
    title: 'Your plan',
    headline: 'Save {amount} each payday and Christmas is paid for by {date}.',
    already: 'Christmas is already paid for.',
    alreadyMore: 'Anything you put aside from here is a head start on January.',
    noPaydays: 'With no paydays left before Christmas, you’re {short} short.',
    noPaydaysMore: 'The ideas in step 4 can close it.',
    needPayday: 'Add your payday in step 1 and your plan appears here.',
    empty: 'Add who you’re buying for and what else Christmas costs, and your plan appears here.',
    stretch: 'That’s {more} more each payday than you said you could manage. The ideas in step 4 can bring it down.',
    giftsHeading: 'Your gift list',
    giftsHint: 'Tick them off as you go through December. Your ticks are saved on this device.',
    bought: 'Bought',
    wrapped: 'Wrapped',
    boughtCount: '{done} of {total} bought',
    santaLine: 'Family Secret Santa',
    santaIdea: 'One present for whoever you pick',
    homemadeTag: 'Homemade or a gift of time',
    noGifts: 'No presents on your list yet.',
    trackerHeading: 'Your payday tracker',
    trackerHint: 'Tick each payday once the money is put aside.',
    putAside: 'Put aside {amount}',
    running: '{amount} saved',
    paidFor: 'Paid for',
    trackerDone: 'Put aside on {date}',
    trackerNone: 'No paydays left to track before Christmas.',
    extrasHeading: 'Everything else',
    extrasNone: 'Nothing added yet.',
    total: 'Total',
    edit: 'Change something',
    hardYear: 'And if Christmas feels heavy this year for reasons that have nothing to do with money, be kind to yourself. A quieter Christmas still counts.',
    // Faith: these two lines are the only ones in the tool.
    faith: 'The best Christmas gifts were given freely, and none of them came on credit.',
    verse: { text: 'Thanks be to God for his indescribable gift!', ref: '2 Corinthians 9:15' },
    startAgain: 'Start again'
  },

  keep: {
    heading: 'Print it, stick it on the fridge',
    body: 'Your plan on one page, with the gift list, the payday tracker and a pledge to sign together. The shopping list is a page to take round the shops.',
    planButton: 'My Debt-Free Christmas Plan (PDF)',
    listButton: 'Christmas shopping list (PDF)',
    working: 'Making your PDF…',
    done: 'Your PDF has downloaded.',
    printed: 'Your browser couldn’t make the PDF, so the print window opened instead. Choose “Save as PDF” there.'
  },

  // "Suggest a cheaper Christmas to your family"
  message: {
    button: 'Suggest a cheaper Christmas to your family',
    heading: 'A message for the family',
    intro: 'Pick an idea and a tone, then make it sound like you. It’s easier to send than you think, and someone else is probably hoping for it too.',
    ideaLegend: 'The idea',
    ideas: { santa: 'Secret Santa', cap: 'A spending cap' },
    toneLegend: 'The tone',
    tones: { light: 'Light-hearted', honest: 'Honest', short: 'Short' },
    honestNote: 'The honest one mentions money being tighter this year. The other two don’t.',
    amount: { santa: 'About this much per present', cap: 'Limit per present' },
    textLabel: 'Your message',
    textHint: 'Change anything you like. Picking a different idea or tone starts it again.',
    copy: 'Copy message',
    whatsApp: 'Send on WhatsApp',
    copied: 'Copied. Paste it into your family chat.',
    copyFailed: 'Copying didn’t work here. Select the message and copy it yourself.',
    // {amount} becomes the amount, e.g. £20. Only the honest tone mentions money being tight.
    templates: {
      light: {
        santa: 'Hello all. I’ve had a Christmas brainwave: a family Secret Santa this year? We each pull one name out of a hat and find that person one really good present, about {amount}, instead of a pile of smaller ones. Less shopping, less wrapping, and a bit of mystery on the day. Who’s in?',
        cap: 'Hi everyone. A Christmas proposal: shall we put a {amount} limit on presents for each other this year? Finding something brilliant for {amount} is half the fun, and it saves us all from the panic buy on Christmas Eve. Let me know what you think.'
      },
      honest: {
        santa: 'Hi everyone. Can I suggest something for Christmas? Money is tighter for us this year, and I’d love Christmas to be about being together rather than what we spend. Could we do a family Secret Santa, one name each and about {amount} a present? I hope that’s all right to ask. If anyone else would find it a relief too, you’re not the only one.',
        cap: 'Hi everyone. Can I suggest something for Christmas? Money is tighter for us this year, and I’d rather say so than quietly worry about it. Would anyone mind if we kept presents between the grown-ups to {amount} each? Being together is the bit I care about. Thank you for understanding.'
      },
      short: {
        santa: 'Fancy a family Secret Santa this year? One name each, about {amount} a present. Who’s in?',
        cap: 'Shall we keep presents for each other to {amount} this year? Let me know.'
      }
    }
  },

  // Links at the end
  more: {
    heading: 'Keep going',
    app: 'Track your Christmas savings pot in the free Money in Motion app.',
    appLink: 'Open the app',
    debt: 'Still paying off last Christmas? The Debt Snowball Planner shows the month you’ll be clear.',
    debtLink: 'Plan my snowball',
    quiz: 'Not sure where to start with the rest of your money?',
    quizLink: 'Which Baby Step am I on?'
  },

  email: {
    heading: 'Want a nudge each payday until Christmas?',
    intro: 'A short payday email each month until Christmas to keep you on track, plus the Thursday email from Money in Motion each week. Your plan works either way, and it never leaves this device.',
    button: 'Nudge me'
  },

  pdf: {
    eyebrow: 'Christmas Without Debt',
    plan: {
      filename: 'my-debt-free-christmas-plan.pdf',
      title: 'My Debt-Free Christmas Plan',
      subtitle: 'Christmas {year}',
      saveEach: 'Save {amount} each payday',
      paidBy: 'Christmas is paid for by {date}',
      costs: 'Christmas costs {amount}',
      saved: '{amount} already saved',
      paydays: '{count} before Christmas',
      gifts: 'Gifts',
      idea: 'Idea',
      budget: 'Budget',
      bought: 'Bought',
      wrapped: 'Wrapped',
      extras: 'Everything else',
      total: 'Total',
      giftTotal: 'Gift total',
      tracker: 'Payday tracker',
      trackerEach: '{amount} each payday.',
      trackerHint: 'Tick each one once the money is put aside.',
      adds: 'How it adds up',
      cost: 'Christmas costs',
      have: 'We’ll have by {cutoff}',
      short: 'Short by',
      spare: 'To spare',
      pledge: 'This Christmas, we’ll pay as we go, not borrow.',
      signed: 'Signed',
      help: 'Free, confidential money help:',
      app: 'Track your Christmas savings pot in the free Money in Motion app'
    },
    list: {
      filename: 'christmas-shopping-list.pdf',
      title: 'Christmas shopping list',
      subtitle: 'Christmas {year}',
      intro: 'Budget for presents: {amount}. Tick each one off and write down what you spent.',
      name: 'Name',
      idea: 'Gift idea',
      budget: 'Budget',
      bought: 'Bought',
      spent: 'Spent',
      total: 'Total',
      empty: 'No presents on the list yet.'
    }
  }
};
