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
- [All Options](#all-options)
- [Data provided to the Template](#data-provided-to-the-template)
  - [All Parameters](#all-parameters)
  - [The "items" Array](#the-items-array)
- [Custom CSS Classes](#custom-css-classes)
- [Constraints & Date Pickers](#constraints--date-pickers)
- [Switching the View](#switching-the-view)
- [Asynchronously loading Calendar Events](#asynchronously-loading-calendar-events)
- [Public API](#public-api)
- [Internationalization](#internationalization)
- [Key Differences to CLNDR](#key-differences-to-clndr)
  - [Migrate from CLNDR to CLNDR2](#migrate-from-clndr-to-clndr2)
  - [Considerations when Migrating](#considerations-when-migrating)

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
  {render: compiled}
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
  <div class="month"><%= format(interval.start, 'MMMM') %></div>
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
  render: precompiledTemplate,
});
```

The `render` function must return the HTML result of the rendering operation.

CLNDR has been tested successfully with [doT.js](http://olado.github.io/doT/), [Hogan.js](http://twitter.github.io/hogan.js/), [Handlebars.js](http://handlebarsjs.com/), [Mustache.js](https://github.com/janl/mustache.js/), and [Knockout.js](https://github.com/karl-sjogren/clndr-knockout), so CLNDR2 is supposed to support these template engines as well. Please get in touch if you have success with other languages for them to be documented here.

## Calendar Events

Events passed to the calendar may have either just a single date for specifying single-day events, or a start date and an end date for specifying multi-day events. Both types of events, single-day and multi-day, may also be mixed in the array of events that is passed to the calendar.

```typescript
const mixedEvents = [
  {
    title: 'Monday to Friday Event',
    start: '2015-11-04',
    end: '2015-11-08',
  }, {
    title: 'Another multi-day Event',
    start: new Date('2024-04-10'),
    end: 1713112793934,
  }, {
    title: 'A single-day event',
    date: '1992-10-15',
  }, {
    title: 'Also just a single-day event',
    start: '2024-01-18',
    end: '2024-01-18',
  }, {
    date: '2000-06-30',
    custom: 'property',
    another: {custom: 'property'},
  },
];

new Clndr(document.getElementById('calendar'), {
  render: template,
  events: mixedEvents,
});
```

Generally, the event objects may consist of random properties, yet the calendar needs to find a date, or a start date and an end date in the object. By default, the parameters the calendar recognizes are `date`, `start` and `end`. The name of these parameters may be customized using the `dateParameter` option.

The event objects provided to the calendar are passed in their entirety to the template, filtered by the calendar objects currently rendered. For example, a day calendar item will be populated only with the events that take place on that day. Multi-day events are passed to every single day within their interval.

## All Options

See the [Storybook demos](https://clndr2.snater.com) for additional documentation of the options and default values.

Example configuration:

```typescript
new Clndr(container, {

  // The function rendering your template. See below for the data that is being
  // passed to the template rendering function. This may also be an object with
  // the keys referring to the views to enable if switching between views is to
  // enabled, see "Switching the View" section.
  render: data => ejs.render(template, data),

  // Whether clicking the item of the preceding or following page navigates to
  // that page. Currently, only relevant for the `month` view where days of
  // adjacent months may be rendered on the page of the current month according
  // to the `showAdjacent` option.
  adjacentItemsChangePage: false,

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
    adjacent: "adjacent",
  },

  // Handlers for interaction events. The keyword 'this' is set to the
  // calendar instance in all callbacks.
  on: {
    // A callback triggered when the calendar is done rendering.
    afterRender: function(this: Clndr, parameters: {
      // The calendar's root element.
      element: HTMLElement

      // The interval that is about to be rendered.
      interval: {start: Date, end: Date},
      
      // The view rendered.
      view: 'decade' | 'year' | 'month' | 'week' | 'day',
    }) {/*...*/},

    // A callback triggered when the calendar is about to render.
    beforeRender: async function(this: Clndr, parameters: {
      // The calendar's root element.
      element: HTMLElement

      // The interval that is about to be rendered.
      interval: {start: Date, end: Date},
      
      // The view rendered.
      view: 'decade' | 'year' | 'month' | 'week' | 'day',
    }) {/*...*/},

    // Triggered whenever a calendar box is clicked.
    click: function(parameters: {
      // The date clicked on; not necessarily provided, since it might be an
      // empty "filler" element that was clicked on.
      date?: Date,

      // The origin view of the event.
      view: 'decade' | 'year' | 'month' | 'week' | 'day'

      // The events on the date being clicked as provided by `options.events`.
      events: ClndrEvent[],

      // Whether the clicked triggered changing the selected date, if the
      // `trackSelectedDate` option is activated.
      selectedDateChanged: boolean,

      // Whether the calendar item clicked is or contains today.
      isToday: boolean,

      // The element clicked on.
      element: HTMLElement,
    }) {/*...*/},

    // Triggered whenever navigating the calendar, which is any operation other
    // than directly clicking a calendar box, i.e. clicking the "back" and
    // "forward" buttons, clicking the "today" button etc. 
    navigate: function(parameters: {
      // Date objects describing the lower and upper end of the new page's
      // interval.
      interval?: {start: Date, end: Date},

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
    }) {/*...*/},

    // Callback triggered once the calendar has been initialized and rendered.
    ready: async function(this: Clndr, parameters: {
      // The calendar's root element.
      element: HTMLElement

      // The interval that has been rendered initially.
      interval: {start: Date, end: Date},
      
      // The view that hass been rendered initially.
      view: 'decade' | 'year' | 'month' | 'week' | 'day',
    }) {/*...*/},

    // Callback triggered whenever the view is switched. The callback is
    // triggered before rendering, hence any updated to the calendar events
    // done here, will be considered when rendering the new view. 
    switchView: async function(this: Clndr, parameters: {
      // The view that is switched to.
      view: 'decade' | 'year' | 'month' | 'week' | 'day',
    }) {/*...*/},
  },

  // Prevent the user from navigating the calendar outside of a certain date
  // range (e.g. when configuring a date picker) by specifying either the
  // start, end, or both. It's possible to change these dynamically after
  // initialization, see API functions below.
  constraints: {
    start: '2017-12-22',
    end: '2018-01-09',
  },

  // If you're supplying an events array, `dateParameter` configures which
  // key(s) to look for dates in the events provided per the `events` option.
  // You may provide only parts of this object, if you are interested in
  // exclusively configuring single-day or multi-day events only.
  dateParameter: {
    // `date` configures the key to look for the date on single-day events.
    date: 'date',
    start: 'start',
    end: 'end',
  },

  // An array of day abbreviation labels used in the calendar header. If you provided a date-fns
  // locale per the `locale` option, it will be guessed for you.
  daysOfTheWeek: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],

  // The view that should be rendered initially; Only relevant when configuring
  // multiple views to allow switching between views.
  defaultView: 'month',

  // An array of event objects
  events: [
    {
      title: 'This is an event',
      date: '2000-08-20'
    },
    /*...*/
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

  // Whether `inactive` dates (dates considered outside the boundaries defined
  // by the `constraints` option) should be selectable, if the
  // `trackSelectedDate` option is activated.
  ignoreInactiveDaysInSelection: false,

  // Customize the calendar's pagination. That is, if the calendar should, for
  // example, render more than one month, or a certain amount of days at once.
  // Pagination may be configured individual to each view when using multiple
  // views, see "Switching the View" section.
  pagination: {
    // Keys may be either `day`, `week`, `month`, `year`, or `decade` to
    // configure multiple calendar views that may be switched between.
    month: {

      // Adjust to render more than one element (in this case month) at the
      // same time.
      size: 1,
  
      // The amount of elements (in this case months) that will be navigated
      // forward/backward when paging the calendar.
      // If not set, `size` will be used for paginating.
      step: 1
    },
  },
  
  // A date-fns locale to use when formatting date strings (the month name passed to the template,
  // the day abbreveiations in the calendar header).
  locale: undefined,

  // A date that should be selected (that is its element is supposed to receive the
  // `classes.selected` class) at the time the calendar is initialized.
  selectedDate: null,

  // Whether to show the items of pages adjacent to the current page.
  // Currently, only relevant for the `month` view where it allows rendering
  // days of months adjacent to the current month for achieving an fully
  // populated grid of days.
  showAdjacent: true,

  // Determines the point in time that should be within the view rendered
  // initially. May be either a Date object, a string or number to be passed to
  // the `Date` constructor. If not provided, today's date is used.
  startOn: '1992-10',

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
    switchWeekButton: 'clndr-switch-week-button',
    switchMonthButton: 'clndr-switch-month-button',
    switchYearButton: 'clndr-switch-year-button',
    switchDecadeButton: 'clndr-switch-decade-button',
  },

  // Whether the last clicked day should be tracked, that is applying the `classes.selected` class
  // to the day that was clicked last. If trackSelectedDate is true, "selected" class will always be
  // applied only to the most recently clicked date; otherwise selectedDate will not change.
  trackSelectedDate: false,

  // Use the "touchstart" event instead of "click" for binding the relevant `on` handlers.
  useTouchEvents: false,
  
  // Start the week off on Sunday (0), Monday (1), etc. Sunday is the default.
  weekOffset: 0,
});
```

## Data provided to the Template

While the properties of the data being passed to the template will always be defined, the population of some of the data properties depends on whether custom pagination is configured (using the `pagination` option).

### All Parameters

```typescript
// Start and end of the current page's interval.
interval: {start: Date, end: Date}

// When the calendar is configured to display multiple pages at a time per a
// view's `pagination` option, this will contain a Date object for each page
// referring to the start of each page's interval. For rendering the items of
// each page, the `pages` can be looped over and the corresponding items be
// rendered like this:
// ```
// pages.forEach((page, pageIndex) => {
//   ... items[pageIndex].forEach(item => ...) ...
// )}
// ```
pages: Date[]

// The `items` array, documented in more detail below; when the calendar is
// configured to display multiple pages at a time per a view's `pagination`
// options, `items` will be a multi-dimensional array, one array of
// `ClndrItem` objects per page.
items: ClndrItem[] | ClndrItem[][]

// The events of the current page as well as the events of the previous and
// next page. `events.currentPage` is a multi-dimensional array if the
// pagination size of the current view is greater than 1.
// `events.previousPage` and `events.nextPage` may be used to get the events of
// adjacent pages if the `showAdjacent` option is turned on. Currently, that
// option is relevant for the `month` view only.
events: {
  currentPage: ClndrEvent[] | ClndrEvent[][]
  previousPage: ClndrEvent[]
  nextPage: ClndrEvent[]
}

// An array of day-of-the-week abbreviations, shifted as configured by the
// `weekOffset` parameter, i.e. `['S', 'M', 'T', etc...]`.
daysOfTheWeek: string[]

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
  interval?: {start: Date, end: Date}
  day?: number
  date?: Date
  events?: ClndrEvent[]
  classes: string
  properties?: {isToday: boolean, isInactive: boolean, isAdjacent: boolean}
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
the `constraints` options can be set with `start`, `end`, or both specified:

```typescript
new Clndr(container, {
  render: ...,
  constraints: {
    start: '1992-10-15',
    end: '2024-10-15',
  }
});
```

This causes the calendar's next and previous buttons to only work within this date range. When they become disabled they will have the class `inactive` applied to them, which can be used to make them appear disabled.

The days in the grid that are outside the range will also have the `inactive` class applied. Therefore, the click callbacks provided to relevant `on` callbacks should check whether a day has the class `inactive` applied:

```typescript
new Clndr(container, {
  render: ...,
  constraints: {
    start: '1992-10-15',
    end: '2024-10-15',
  },
  on: {
    click: target => {
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

CLNDR2 is capable of switching between different views for easing navigation. The currently available views are `day`, `week`, `month`, `year` and `decade`. (Additional views will be added in the future.) In order to activate the capability to switch between views, instead of a single `render` function, a `render` function needs to be provided for each view that should be possible to be switched to:

```typescript
const clndr = new Clndr(container, {render: {
  year: data => {...},
  month: data => {...},
}});
```

Additionally, you may also customize the pagination for each view:

```typescript
const clndr = new Clndr(container, {
  render: {
    year: data => {...},
    month: data => {...},
  },
  pagination: {
    month: {size: 2},
  },
});
```

Use the `defaultView` option to customize the initial view (if a pagination is provided for `month`, it is `month` by default, otherwise the most granular view that `pagination` is configured for is used):

```typescript
const clndr = new Clndr(container, {
  render: {
    year: data => {...},
    month: data => {...},
  },
  defaultView: 'year',
  pagination: {
    year: {size: 1},
    month: {size: 2},
  },
});
```

There is no need to configure `defaultView` when either
- only using one view, or
- when the default view is supposed to be `month` while `render` is a function instead of an object, or
- when the default view is supposed to be the most granular view, i.e. `day` when configuring views for `day`, `month` and `year`.

## Asynchronously loading Calendar Events

The `beforeRender` and `afterRender` callbacks may be used to asynchronously load events and add them to the calendar.

For `beforeRender`, the callback may be implemented like in the following simple example:

```typescript
const cache: string[] = [];

async function beforeRender(
  // Tell TypeScript about the function's context:
  // https://www.typescriptlang.org/docs/handbook/2/functions.html#declaring-this-in-a-function
  this: Clndr,
  {element, interval}: {element: HTMLElement, interval: Interval}
) {
  if (cache.includes(format(interval.start, 'yyyy-MM'))) {
    // Events for this interval have already been fetched.
    return;
  }

  // Set some loading indication in the UI.
  element.querySelector('.clndr .loading')?.classList.add('show');

  // Fetch events within the interval and add a reference for the interval to
  // the cache.
  const additionalEvents = await fetchEvents(interval);
  cache.push(format(interval.start, 'yyyy-MM'));

  this.addEvents(additionalEvents);

  // Remove the loading indication.
  element.querySelector('.clndr .loading')?.classList.remove('show');
}

new Clndr(container, {
  /*...*/
  on: {beforeRender}
  /*...*/
});
```

Updating the calendar events on `afterRender` has to be done slightly different:

```typescript
async function afterRender(
  this: Clndr,
  {element, interval}: {element: HTMLElement, interval: Interval}
) {
  /* ... same as in the `beforeRender` example ... */

  // Since rendering has already been performed, it needs to be retriggered;
  // yet only in case the calendar events were requested for the interval
  // currently rendered. Otherwise, there might be a race conditions when doing
  // async operations like fetching data from a server. Therefore, doing this
  // check prevents unneccesary re-renderings.
  if (interval.start === this.getInterval().start) {
    element.querySelector('.clndr .loading')?.classList.remove('show');
    await this.render();
  }
}

new Clndr(container, {
  /*...*/
  on: {afterRender}
  /*...*/
});
```

Caching like in the examples will only work for a calendar setup featuring just one view. When configuring multiple views, more sophisticated caching is necessary. The most simple cache would be to assign an `id` property to each calendar event and check if the event with that `id` was already added to the calendar. However, that would be one of the least performant options, particularly when dealing with a large number of events, because the operation fetching events would still need to be triggered on all navigation, as well as the whole cached array of events would need to be compared to the (potentially duplicate) fetched events.

An improvement would be to cache the events on "view" level, i.e. per `month`, `year` etc. The events would be fetched in either `beforeRender` or `afterRender`. A callback triggered on `switchView` would exchange the events rendered in the calendar calling `setEvents()`. An example of this concept can be found in the [Storybook demos](https://clndr2.snater.com).

## Public API

It's possible to programmatically update the calendar after initialization. Navigating and updating the calendar will trigger relevant event handlers provided per the `on` option.

```typescript
const clndr = new Clndr(container, {render: {...}});

// Gets the currently rendered view.
const view: 'decade' | 'year' | 'month' | 'week' | 'day' = clndr.getView();

// Gets the interval currently rendered.
const interval: {start: Date, end: Date} = clndr.getInterval();

// Gets the date currently selected, if the `trackSelectedDate` option is
// activated.
const selectedDate: Date = clndr.getSelectedDate();

// Switch the view ensuring the provided date is on the page. If no date is
// provided, the start of the current page's interval is used.
await clndr.switchView('year', '2024');

// Navigate to the next page.
await clndr.next();

// Navigate to the previous page.
await clndr.previous();

// Sets a specific date ensuring that date is on the page.
await clndr.setDate('2024-01-18');

// Set the month using a number from 0-11.
await clndr.setMonth(0);

// Navigate to the next year.
await clndr.nextYear();

// Navigate to the previous year.
await clndr.previousYear();

// Set the year.
await clndr.setYear(1992);

// Navigate to today.
await clndr.today();

// Overwrite the extras. Note that this does NOT trigger re-rendering the calendar.
clndr.setExtras(newExtras);

// Change the events. Note that this does NOT trigger re-rendering the calendar.
clndr.setEvents(newEventsArray);

// Add events. Note that this does NOT trigger re-rendering the calendar.
clndr.addEvents(additionalEventsArray);

// Remove events. All events for which the provided function returns true will be removed from the
// calendar. Note that this odes NOT trigger re-rendering the calendar.
clndr.removeEvents(event => event.id === idToRemove);

// Trigger re-rendering the calendar.
clndr.render();
```

## Internationalization

CLNDR2 has support for internationalization insofar as date-fns supports it. A date-fns locale may be passed to a calendar instance using the `locale` option. This will have the following effects:
- If neither `daysOfTheWeek`, nor `formatWeekdayHeader` option is provided, the weekday abbreviations for the calendar header row will be guessed using the date-fns locale.
- The `month` passed to the template is the localized month name.
- The `format` function passed to the template is a proxy for the date-fns `format` function, injected with the `locale ` by default.

For applying additional internationalization, the `extras` option can be used to pass in required functionality. 

## Key Differences to CLNDR

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
  render: template,
});
```

### Considerations when Migrating

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