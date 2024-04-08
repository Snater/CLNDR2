# CLNDR2

[![NPM version][npm-version-image]][npm-url] [![Test status][github-action-image]][github-action-url] [![Coverage Status][test-coverage-image]][test-coverage-url]

CLNDR2 is a straightforward framework-agnostic front-end calendar widget operating on HTML templates powered by the template rendering engine of your choice.<br />
It is the unofficial successor to awesome [CLNDR](https://github.com/kylestetz/CLNDR). If you intend to migrate from CLNDR to CLNDR2, check out the [migration notes](#key-differences-to-clndr).

**👉 Demos and additional documentation: https://clndr2.snater.com**

---

- [Basic Usage](#basic-usage)
- [Dependencies](#dependencies)
- [Installation](#installation)
- [Templating](#templating)
  - [Configuration using CSS Classes](#configuration-using-css-classes)
  - [Template Rendering Engine](#template-rendering-engine)
- [Calendar Events](#calendar-events)
  - [Single-day Events](#single-day-events)
  - [Multi-day Events](#multi-day-events)
  - [Mixing Multi-day and Single-day Events](#mixing-multi-day-and-single-day-events)
- [All Options](#all-options)
- [Data provided to the Template](#data-provided-to-the-template)
  - [All Parameters](#all-parameters)
  - [The "items" Array](#the-items-array)
- [Custom CSS Classes](#custom-css-classes)
- [Constraints & Date Pickers](#constraints--date-pickers)
- [Public API](#public-api)
- [Internationalization](#internationalization)
- [Key differences to CLNDR](#key-differences-to-clndr)
  - [Migrate from CLNDR to CLNDR2](#migrate-from-clndr-to-clndr2)
  - [Considerations when migrating](#considerations-when-migrating)

## Basic Usage

CLNDR2 requires a template engine to be hooked up for rendering. Apart from a reference to an HTML element, the only requirement for CLNDR2 to render a calendar is a `render` function to be provided. Basically, this function is supposed to be a wrapper for a template engine of your choice. A common choice for templating is [EJS](https://ejs.co/), which is also implemented in [Underscore](https://underscorejs.org/) and [lodash](https://lodash.com/).

The following minimal example uses EJS:

```typescript
import Clndr from 'clndr2';
import {render} from 'ejs';

const clndr = new Clndr(
  document.getElementById('calendar'),
  {render: data => render('... your template HTML string ...', data)}
);
```

Of course, you can also precompile your template, so compilation would not need to run on every render cycle of the calendar:

```typescript
import Clndr from 'clndr2';
import {compile} from 'ejs';

const compiled = compile('... your template HTML string ...');

const clndr = new Clndr(
  document.getElementById('calendar'),
  {render: data => compiled(data)}
);
```

## Dependencies

[date-fns](https://date-fns.org/) is required for date calculations. Instead of baking it into the CLNDR2 build, it is installed as peer dependency, so you can use date-fns in your project without duplicating functionality imported from of date-fns. date-fns operates on native `Date` objects. Hence, an advantage of using date-fns is not locking in to a specific date model or library. Additionally, by date-fns supporting tree-shaking, only the date-fns functions actually used will be included in your build, which results in a minimal footprint of CLNDR2 along with date-fns in your build.

## Installation

CLNDR2 can be installed via [NPM](https://www.npmjs.com/package/clndr2):

```shell
npm i clndr2
```

## Templating

Here's a typical CLNDR2 template for EJS, Underscore and lodash. It's got a controls section and a grid section.

```html
<div class="clndr-controls">
  <div class="clndr-previous-button">&lsaquo;</div>
  <div class="month"><%= format(interval[0], 'MMMM') %></div>
  <div class="clndr-next-button">&rsaquo;</div>
</div>
<div class="clndr-grid">
  <div class="days-of-the-week">
  <% daysOfTheWeek.forEach(day => { %>
    <div class="header-day"><%= day %></div>
  <% }) %>
    <div class="days">
    <% items.forEach(day => { %>
      <div class="<%= day.classes %>"><%= day.day %></div>
    <% }) %>
    </div>
  </div>
</div>
```

### Configuration using CSS Classes

Applying `day.classes`, the class on a day is set to, for example, `'calendar-day-2024-01-18'`. This class is used to determine the date when a user clicks on it. Thus, click events will only work if `items.classes` is included in your day element's `class` attribute as seen above.

### Template Rendering Engine

[CLNDR had been tested successfully with multiple template engines](https://github.com/kylestetz/CLNDR?tab=readme-ov-file#template-rendering-engine). Since there was no change to the templating interface, any template engine working with CLNDR should work with CLNDR2 just the same.

The basic concept is to provide a `render` function:

```typescript
const precompiledTemplate = myRenderingEngine.template('...my template HTML string...');

new Clndr(container, {
  render: data => precompiledTemplate(data),
});
```

The `render` function must return the HTML result of the rendering operation.

CLNDR has been tested successfully with [doT.js](http://olado.github.io/doT/), [Hogan.js](http://twitter.github.io/hogan.js/), [Handlebars.js](http://handlebarsjs.com/), [Mustache.js](https://github.com/janl/mustache.js/), and [Knockout.js](https://github.com/karl-sjogren/clndr-knockout), so CLNDR2 is supposed to support these template engines as well. Please get in touch if you have success with other languages for them to be documented here.

## Calendar Events

You can set up the calendar using either single-day or multi-day events. When configuring multi-day events, single-day events can be specified as well.

### Single-day Events

Single-day events are to be passed to the calendar as an array of objects:

```typescript
events: ClndrEvent[] = [{
  date: 'Date object, YYYY-MM-DD or some other ISO Date format provided to the Date constructor',
  and: 'anything else',
}]
```

CLNDR2 looks through the objects in your events array for a `date` field unless you specify otherwise using the `dateParameter` option. In your template, the `items` array will contain these event objects in their entirety.

### Multi-day Events

You may also provide events spanning across multiple days.

```typescript
const template = ejs.compile(myTemplate);

const lotsOfEvents = [
  {
    title: 'Monday to Friday Event',
    startDate: '2013-11-04',
    endDate: '2013-11-08',
  }, {
    title: 'Another Long Event',
    startDate: '2013-11-15',
    endDate: '2013-11-20',
  },
];

new Clndr(document.getElementById('calendar'), {
  render: data => template(data),
  events: lotsOfEvents,
});
```

When looping through days in the example template, the "Monday to Friday Event" will be passed to *every single day* between the start and end date. The keys where the calendar can expect the start and end date of the events to be stored within the event objects can be customised by configuring the `dateParameter` option.

### Mixing Multi-day and Single-day Events

Multi-day and single-day events may be mixed. In the example, the `dateParameter` option is used to specify custom keys, though you may also just use the defaults instead.

```typescript
const mixedEvents = [
  {
    title: 'Monday to Friday Event',
    start: '2015-11-04',
    end: '2015-11-08',
  }, {
    title: 'Another Long Event',
    start: '2015-11-15',
    end: '2015-11-20',
  }, {
    title: 'Birthday',
    day: '2015-07-16',
  },
];

new Clndr(document.getElementById('calendar'), {
  render: data => template(data),
  events: mixedEvents,
  dateParameter: {
    date: 'day',
    startDate: 'start',
    endDate: 'end',
  },
});
```

## All Options

See the [Storybook demos](https://clndr2.snater.com) for additional documentation of the options and default values.

Example configuration:

```typescript
new Clndr(container, {

  // The function rendering your template. See below for the data that is being passed to the
  // template rendering function
  render: data => ejs.render(template, data),

  // Whether clicking the day of the preceding or following month navigates to that month.
  // Triggers nextMonth/previousMonth/onMonthChange click callbacks.
  adjacentDaysChangeMonth: false,

  // Custom classes to avoid styling issues. pass in only the classnames that you wish to override.
  // These are the defaults:
  classes: {
    past: "past",
    today: "today",
    event: "event",
    selected: "selected",
    inactive: "inactive",
    lastMonth: "last-month",
    nextMonth: "next-month",
    adjacentMonth: "adjacent-month",
  },

  // Event handlers for the click event. The keyword 'this' is set to the CLNDR
  // instance in all callbacks.
  clickEvents: {
    // Triggered whenever a calendar box is clicked.
    onClick: function(parameters: {
      // Date represented by the calendar box. The date is `undefined` when
      // clicking on an "empty" box.
      date?: Date,

      // The events on the date being clicked as provided by `options.events`.
      events: ClndrEvent[],

      // Whether the clicked triggered changing the selected date.
      selectedDateChanged: boolean,

      // Wether the date clicked is today.
      isToday: boolean,

      // The HTML element targeted by the click; `undefined` when navigating
      // programmatically.
      element?: HTMLElement,
    }) {...},

    // Triggered whenever navigating the calendar, which is any operation other
    // than directly clicking a calendar box, i.e. clicking the "back" and
    // "forward" buttons, clicking the "today" button etc. 
    onNavigate: function(parameters: {
      // The interval of the new page.
      interval?: [Date, Date],

      // Whether the new page is before the one previously rendered (i.e.
      // navigating backward).
      isBefore: boolean,

      // Whether the new page is after the one previously rendered (i.e.
      // navigating forward).
      isAfter: boolean,

      // Whether month was changed (includes navigating to the same month in
      // another year).
      monthChanged: boolean,

      // Wether the year was changed.
      yearChanged: boolean,

      // The HTML element targeted by the click; `undefined` when navigating
      // programmatically.
      element?: HTMLElement,
    }) {...},
  },

  // Prevent the user from navigating the calendar outside of a certain date range by specifying
  // (e.g. when configuring a date picker) by specifying either the startDate, endDate, or both in
  // It's possible to change these dynamically after initialization, see API functions below.
  constraints: {
    startDate: new Date('2017-12-22'),
    endDate: new Date('2018-01-09'),
  },

  // If you're supplying an events array, dateParameter configures which key(s) to look for dates
  // in the events provided per the `events` option. You may set this to a plain string when setting
  // up a calendar with single-day events only.
  dateParameter: {
    // `date` configures the key of single-day events.
    date: 'date',
    startDate: 'startDate',
    endDate: 'endDate',
  },

  // An array of day abbreviation labels used in the calendar header. If you provided a date-fns
  // locale per the `locale` option, it will be guessed for you.
  daysOfTheWeek: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],

  // A callback triggered when the calendar is done rendering.
  doneRendering: function() {...},

  // An array of event objects
  events: [
    {
      title: 'This is an event',
      date: '2000-08-20'
    },
    ...
  ],

  // Any other data variables you want access to in your template. Use this option if you would like
  // to pass in date-fns functions to your template.
  extras: {},

  // Always make the calendar six rows tall (42 days) so that every month has a consistent height.
  forceSixRows: false,

  // Optional callback function that formats the day in the header. Default is as specified below
  // using date-fns' `format`. The function is passed a Date object representing the day, as well as
  // a date-fns locale, if provided per the `locale` option.
  formatWeekdayHeader: (day, locale) => {
    return format(day, 'cccccc', {locale}).charAt(0);
  },

  // Whether `inactive` dates (dates considered outside the boundaries defined by the `constrains`
  // option) should be selectable, if the `trackSelectedDate` option is activated.
  ignoreInactiveDaysInSelection: false,

  // Customize the calendar's pagination. That is, if the calendar should
  // render more than one month, or a certain amount of days at once.
  pagination: {
    // May be set to either `day`, `month`, or `year`.
    scope: 'month',

    // Adjust to render more than one month at the same time (when
    // `scope === 'month')` or set `scope` to `day` to define how many days to
    // display at the same time, i.e. displaying a week setting `size` to `7`.
    size: 1,

    // The amount of months or days that will be navigated forward/backward
    // when paging the calendar, i.e. `scope === 'day'` together with
    // `size === 14` and `step === 7` would result in a calendar displaying two
    // weeks with paging forward and backward one week at a time.
    // If not set, `size` will be used for paginating.
    step: 1
  },
  
  // A date-fns locale to use when formatting date strings (the month name passed to the template,
  // the day abbreveiations in the calendar header).
  locale: undefined,

  // Callback triggered once the calendar has been initialized and rendered.
  // `this.element` refers to the parent element that holds the calendar.
  ready: function() {...},

  // A date that should be selected (that is its element is supposed to receive the
  // `classes.selected` class) at the time the calendar is initialized.
  selectedDate: null,

  // Whether to show the dates of days in months adjacent to the current month.
  showAdjacent: true,

  // Determines which month to display initially by providing either a date string or a Date object.
  // If not provided, today's date is used.
  startOn: new Date('1992-10'),

  // The target classnames that the calendar will look for to bind events.
  // These are the defaults:
  targets: {
    item: 'item',
    empty: 'empty',
    nextButton: 'clndr-next-button',
    todayButton: 'clndr-today-button',
    previousButton: 'clndr-previous-button',
    nextYearButton: 'clndr-next-year-button',
    previousYearButton: 'clndr-previous-year-button',
    switchYearButton: 'clndr-switch-year-button',
  },

  // Whether the last clicked day should be tracked, that is applying the `classes.selected` class
  // to the day that was clicked last. If trackSelectedDate is true, "selected" class will always be
  // applied only to the most recently clicked date; otherwise selectedDate will not change.
  trackSelectedDate: false,

  // Use the "touchstart" event instead of "click" for binding the `clickEvents` handlers.
  useTouchEvents: false,
  
  // Start the week off on Sunday (0), Monday (1), etc. Sunday is the default.
  weekOffset: 0,
});
```

## Data provided to the Template

While the properties of the data being passed to the template will always be defined, the population of some of the data properties depends on whether custom pagination is configured (using the `pagination` option).

### All Parameters

```typescript
// A tuple of Date objects representing the start and end of the current page's
// interval.
interval: [Date, Date]

// The `items` array, documented in more detail below; when `pagination.scope`
// is set to `month` or `year`, while `pagination.size` is greater than 1, this
// is a multi-dimensional array, one array of `ClndrItem` objects per
// month or year according to `pagination.scope`.
items: ClndrItem[] | ClndrItem[][]

// A Date object representing the current month. This is an convenience
// parameter euqal to interval[0].
month: Date

// An array of Date objects representing the months of the current page,
// particularly useful if `pagination.scope` is set to `month` and
// `pagination.size` is greater than 1. In that case, use this property
// to loop over the months and render the days per month, i.e.
// ```
// months.forEach((month, monthIndex) => {
//   ... items[monthIndex].forEach(day => ...) ...
// )}
// ```
months: Date[]

// A Date object representing the current year. This is an convenience
// parameter euqal to interval[0].
year: Date

// An array of Date objects representing the years of the current page,
// particularly useful if `pagination.scope` is set to `year` and
// `pagination.size` is greater than 1. In that case, use this property
// to loop over the years and render the months per year, i.e.
// ```
// years.forEach((year, yearIndex) => {
//   ... items[yearIndex].forEach(month => ...) ...
// )}
// ```
years: Date[]

// The events of the current page as well as the events of the previous and
// next scope. `events.currentPage` is a multi-dimensional array if
// `pagination.scope` is `month` and `pagination.size` is greater than 1.
// `events.previousScope` and `events.nextScope` may be used to get the events
// if the `showAdjacentMonths` option is turned on. Both are empty if
// `pagination.scope` is set to `day`.
events: {
  currentPage: ClndrEvent[] | ClndrEvent[][]
  previousScope: ClndrEvent[]
  nextScope: ClndrEvent[]
}

// An array of day-of-the-week abbreviations, shifted as configured by the
// `weekOffset` parameter, i.e. `['S', 'M', 'T', etc...]`.
daysOfTheWeek: string[]

// The number of 7-block calendar rows, in case of wanting to do some looping
// with it.
numberOfRows: number

// A proxy for date-fns' `format` function being equiped with the locale
// provided to the `locale` option.
format: (date: Date, formatStr: string, options: FormatOptions) => string

// Anything passed per the `extras` options when creating the calendar.
extras: unknown | null
```

### The "items" Array

The `items` array contains most of the data needed to render the calendar. Its structure looks like this:

```typescript
type ClndrItem = {
  interval?: [Date, Date]
  day?: number
  date?: Date
  events?: ClndrEvent[]
  classes: string
  properties?: {isToday: boolean, isInactive: boolean, isAdjacentMonth: boolean}
}
```

- `interval`: Start and end date of the day.
- `day`: The day of the month.
- `date`: A `Date` object representing the day.
- `events`: The events assigned to this day with all data provided from when the events had been passed to the calendar instance.
- `classes`: CSS classes to be applied to the day's HTML element indicating its status and whether there are events on this day.
- `properties`: Status indicators for the day.

## Custom CSS Classes

The CSS classes that get added to a `day` object can be customized to avoid styling conflicts. The `classes` option accepts `now`, `event`, `past`, `previous`, `next`, `adjacent`, and `inactive`. Pass in only the classnames you wish to override and the rest will be set to their defaults.

In this example a `my-` prefix is added to all classes:

```typescript
new Clndr(container, {
  render: ...,
  classes: {
    past: 'my-past',
    now: 'my-now',
    event: 'my-event',
    inactive: 'my-inactive',
    previous: 'my-previous',
    next: 'my-next',
    adjacent: 'my-adjacent',
  }
});
```

To configure the `item`, `empty`, as well as `next`/`previous`/`today` etc. button classes, the `targets` option can be used.

## Constraints & Date Pickers

For creating a datepicker or to prevent users from *nexting* all the way to 2034 in the calendar,
the `constraints` options can be set with `startDate`, `endDate`, or both specified:

```typescript
new Clndr(container, {
  render: ...,
  constraints: {
    startDate: new Date('1992-10-15'),
    endDate: new Date('2024-10-15'),
  }
});
```

This causes the calendar's next and previous buttons to only work within this date range. When they become disabled they will have the class `inactive` applied to them, which can be used to make them appear disabled.

The days in the grid that are outside the range will also have the `inactive` class applied. Therefore, the click callbacks provided to the `clickEvents` option should check whether or not a day has the class `inactive` applied:

```typescript
new Clndr(container, {
  render: ...,
  constraints: {
    startDate: new Date('1992-10-15'),
    endDate: new Date('2024-10-15'),
  },
  clickEvents: {
    onClick: target => {
      if (!target.element.classList.contains('inactive')) {
        console.log('You picked a valid date!');
      } else {
        console.log('That date is outside of the range.');
      }
    }
  }
});
```

## Switching the View

CLNDR2 is capable of switching the view between year view and month view for easing navigation. (Additional views will be added in the future.) In order to activate the capability to switch between views, instead of a single `render` function, a `render` function needs to be provided for each view that should be possible to be switched to:

```typescript
const clndr = new Clndr(container, {render: {
  year: data => {...},
  month: data => {...},
}});
```


## Public API

It's possible to programmatically update the calendar after initialization.

```typescript
const clndr = new Clndr(container, {render: {...}});

// Navigate to the next month (or interval)
clndr.forward();

// Navigate to the previous month (or interval)
clndr.back();

// Set the month using a number from 0-11
clndr.setMonth(0);

// Navigate to the next year
clndr.nextYear();

// Navigate to the previous year
clndr.previousYear();

// Set the year
clndr.setYear(1992);

// Navigate to today:
clndr.today();

// Overwrite the extras. Note that this triggers re-rendering the calendar.
clndr.setExtras(newExtras);

// Change the events. Note that this triggers re-rendering the calendar.
clndr.setEvents(newEventsArray);

// Add events. Note that this triggers re-rendering the calendar.
clndr.addEvents(additionalEventsArray);

// Remove events. All events for which the provided function returns true will be removed from the
// calendar. Note that this triggers re-rendering the calendar.
clndr.removeEvents((event => event.id === idToRemove}));

// Destroy the calendar instance. This will empty the DOM node containing the calendar.
clndr.destroy();
```

When having provided `onMonthChange` and `onYearChange` callbacks per the `clickEvents` option,
those should potentially be triggered whenever calling `setMonth`, `setYear`, `forward`,
`back`, etc. This can be achieved by passing in an object as an argument containing
`withCallbacks: true`:

```typescript
// Month will be set to October and then onMonthChange will be fired
clndr.setMonth(9, {withCallbacks: true});

// Month will increment and onMonthChange, and possibly onYearChange, will be triggered
clndr.next({withCallbacks: true});
```

## Internationalization

CLNDR2 has support for internationalization insofar as date-fns supports it. A date-fns locale may be passed to a calendar instance using the `locale` option. This will have the following effects:
- If neither `daysOfTheWeek`, nor `formatWeekdayHeader` option is provided, the weekday abbreviations for the calendar header row will be guessed using the date-fns locale.
- The `month` passed to the template is the localized month name.
- The `format` function passed to the template is a proxy for the date-fns `format` function, injected with the `locale ` by default.

For applying additional internationalization, the `extras` option can be used to pass in required functionality. 

## Key differences to CLNDR

- Instead of a jQuery plugin, CLNDR2 provides a `Clndr` class per an ES module.
- The dependency on jQuery is removed.
- The moment dependency is replaced by date-fns.
- There is no soft dependency on Underscore anymore, the `template` option as well as the default template was removed. You just have to provide your own `render` function.
- The source code was overhauled and converted to Typescript.
- There are now [Storybook demos](https://clndr2.snater.com).
- The source code is automatically tested with a 100% code coverage.

### Migrate from CLNDR to CLNDR2

First of all, along with installing CLNDR2, you will also have to install [date-fns](https://date-fns.org/).

Using CLNDR, in your code you have most likely done something like this:

```javascript
$('#calendar').clndr({template: $('#calendar-template').html()});
```

The CLNDR2 equivalent is (using Underscore in the example):

```typescript
import Clndr from 'clndr2';
import _ from 'underscore';

const template = _.compile(document.getElementById('calendar-template').innerHTML);

const clndr = new Clndr(document.getElementById('calendar'), {
  render: data => template(data),
});
```

### Considerations when migrating

- The `template` option was removed to be even less opinionated about your template engine. Therefore, you now *have to* use the `render` option for hooking up your template engine of choice.
- In contrast to moment, date-fns is less opinionated about localisation. The consequence is that when setting a locale on date-fns, this does not automatically configure the day a week starts with. Therefore, you have to use the `weekOffset` option if you would like to have the week start with a day other than Sunday.
- In CLNDR, the moment object was passed into the template along all template data. In CLNDR2, The only date specific function passed to the template is `format`, which is a proxy to [date-fns' `format` function](https://date-fns.org/docs/format) with the locale defaulting to the locale provided per the new `locale` CLNDR2 option. No other date functions are passed to the template. If you want to use date functions in your template, i.e. for date calculations, provide those using the `extras` option.
- date-fns operates on standard `Date` objects. Passing moment objects to CLNDR2 will not work.
- If you want CLNDR2 to localize the day heading and the month name passed to the template, provide a date-fns locale per the new `locale` option.


[npm-url]: https://www.npmjs.com/package/clndr2
[npm-version-image]: https://badge.fury.io/js/clndr2.svg

[github-action-image]: https://github.com/Snater/CLNDR2/actions/workflows/test.yml/badge.svg
[github-action-url]: https://github.com/Snater/CLNDR2/actions/workflows/test.yml

[test-coverage-url]: https://codecov.io/gh/Snater/CLNDR2
[test-coverage-image]: https://codecov.io/gh/Snater/CLNDR2/branch/main/graph/badge.svg