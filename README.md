# CLNDR2

[![NPM version][npm-version-image]][npm-url] [![Test status][github-action-image]][github-action-url] [![Coverage Status][test-coverage-image]][test-coverage-url]

CLNDR2 is a straightforward framework-agnostic front-end calendar widget operating on HTML templates powered by the template rendering engine of your choice.<br />
It is inspired by awesome [CLNDR](https://github.com/kylestetz/CLNDR). If you intend to migrate from CLNDR to CLNDR2, check out the [migration notes](#key-differences-to-clndr).

> 📄 **Documentation: https://clndr2.snater.com/docs**
>
> 📅 **Demos: https://clndr2.snater.com/demos**

---

- [Basic Usage](#basic-usage)
- [Dependencies](#dependencies)
- [Installation](#installation)
- [Templating](#templating)
  - [Configuration using CSS Classes](#configuration-using-css-classes)
  - [Template Rendering Engine](#template-rendering-engine)
- [Calendar Events](#calendar-events)
- [Interaction Events](#interaction-events)
- [Switching the View](#switching-the-view)
- [Asynchronously loading Calendar Events](#asynchronously-loading-calendar-events)
  - [Load new Events before Rendering](#load-new-events-before-rendering)
  - [Load new Events after Rendering](#load-new-events-after-rendering)
  - [Caching Strategies](#caching-strategies)
- [Constraints & Date Pickers](#constraints--date-pickers)
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

Here's a simple CLNDR2 month template for EJS, Underscore and lodash. It's got a controls section for navigating, and a grid section rendering the days of the month.

```html
<div class="clndr-controls">
  <div class="clndr-previous-button" role="button">&lsaquo;</div>
  <div class="month"><%= format(interval.start, 'MMMM') %></div>
  <div class="clndr-next-button" role="button">&rsaquo;</div>
</div>
<div class="clndr-grid">
  <div class="days-of-the-week">
  <% daysOfTheWeek.forEach(day => { %>
    <div class="header-day"><%= day %></div>
  <% }) %>
    <div class="days">
    <% items.forEach(day => { %>
      <div class="<%= day.classes %>"><%= day.date.getDate() %></div>
    <% }) %>
    </div>
  </div>
</div>
```

### Configuration using CSS Classes

Applying `day.classes` in the example, the calendar item will receive multiple CSS classes that are used by the calendar to determine the status of the calendar item as well as any action to be triggered when clicking on the item; That is, for example, whether the calendar item is supposed to be selected or whether the view is supposed to switch. Thus, click events will only work if `item.classes` (`day.classes` as used in the example) is included in your item element's `class` attribute as seen above.

Most of these classes may be customized per the `classes` option to avoid potential class naming conflicts with your CSS.

### Template Rendering Engine

Apart from [EJS](https://ejs.co/)/[Underscore](https://underscorejs.org/)/[lodash](https://lodash.com/), CLNDR2 is supposed to work with any templating engine like [handlebars](http://handlebarsjs.com/), [mustache](https://github.com/janl/mustache.js/), [Knockout](https://knockoutjs.com/), etc.

The basic concept is to provide a `render` function:

```typescript
const precompiledTemplate = myRenderingEngine.template('...my template HTML string...');

new Clndr(container, {
  render: precompiledTemplate,
});
```

The `render` function is passed [a set of parameters](http://clndr2.snater.com/docs/types/types.ClndrTemplateData.html), and it must return the HTML result of the rendering operation.

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

Generally, the event objects may consist of random properties, yet the calendar needs to find a date, or a start date and an end date in the object. By default, the parameters the calendar recognizes are `date`, `start` and `end`. The names of these parameters may be customized using the `dateParameter` option.

Just like being passed to the `events` options, the event objects provided to the calendar are passed in their entirety to the template, filtered according to the calendar objects currently rendered. For example, a day calendar item will be populated only with the events that take place on that day. Multi-day events are passed to every single day within their interval.

## Interaction Events

Per the `on` option, [event callbacks](http://clndr2.snater.com/docs/types/types.InteractionEvents.html) may be provided for handling click, navigation or rendering events. An example use case would be displaying the events of the current day in a separate container when the corresponding day is clicked on:

```typescript
const container = document.createElement('div');

// DOM structure with a container for the calendar, as well as for a list of
// events.
container.innerHTML = `
  <div class="clndr"></div>
  <div class="events hidden">
    <div class="events-header">Events</div>
    <div class="events-list"></div>
  </div>
`;

new Clndr(container.querySelector('.clndr') as HTMLElement, {
  /*...*/
  on: {
    click: target => {
      if (!target.date) {
        // Ignore the user clicking on an empty placeholder.
        return;
      }

      const eventsContainer = document.querySelector('.events');
      const eventList = eventsContainer?.querySelector('.events-list');

      if (!eventsContainer || !eventList) {
        // The HTML structure is not properly set up, you might want to do some
        // error handling here.
        return;
      }

      // The events assigned to the day clicked.
      const events = target.events;

      if (events.length === 0) {
        // Hide and empty the list of events when there are no events on this
        // day.
        eventsContainer.classList.add('hidden');
        eventList.innerHTML = '';
        return;
      }

      // Create some HTML with the event data and fill the event list.
      let html = '';

      events.forEach(event => {
        html += `
          <div class="event">
            <div class="event-title">${event.title}</div>
            <div class="event-body">${event.description}</div>
          </div>
        `;
      });

       eventList.innerHTML = html;

      // Show the list of events in case there are events on the day clicked.
      eventsContainer.classList.remove('hidden');
    },
  },
  /*...*/
});
```

## Switching the View

CLNDR2 is capable of switching between different views for a better navigation experience. The currently available views are `day`, `week`, `month`, `year` and `decade`. (Additional views will be added in the future.) In order to activate the capability to switch between views, instead of a single `render` function, a `render` function needs to be provided for each view that should be possible to be switched to:

```typescript
const clndr = new Clndr(container, {render: {
  year: data => {/*...*/},
  month: data => {/*...*/},
}});
```

Additionally, you may also customize the pagination for each view:

```typescript
const clndr = new Clndr(container, {
  render: {
    year: data => {/*...*/},
    month: data => {/*...*/},
  },
  pagination: {
    // This will display two months at the same time, while there will still be
    // displayed only one year at a time when on the year view. (One is the
    // default page size.)
    month: {size: 2},
  },
});
```

Use the `defaultView` option to customize the initial view (if a pagination is provided for `month`, it is `month` by default, otherwise the most granular view that `pagination` is configured for is used):

```typescript
const clndr = new Clndr(container, {
  render: {
    year: data => {/*...*/},
    month: data => {/*...*/},
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

The `beforeRender` and `afterRender` [callbacks](http://clndr2.snater.com/docs/types/types.InteractionEvents.html) may be used to asynchronously load events and add them to the calendar.

### Load new Events before Rendering

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

### Load new Events after Rendering

Updating the calendar events on `afterRender` has to be done slightly different:

```typescript
async function afterRender(
  this: Clndr,
  {element, interval}: {element: HTMLElement, interval: Interval}
) {
  /* ... same as in the `beforeRender` example ... */

  // Since rendering has already been performed, it needs to be retriggered;
  // yet only in case the calendar events were requested for the interval
  // currently rendered. Otherwise, there might be race conditions when doing
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

### Caching Strategies

Caching like in the examples will only work for a calendar setup featuring just one view. When configuring multiple views, more sophisticated caching is necessary. The most simple cache would be to assign an `id` property to each calendar event and check if the event with that `id` was already added to the calendar. However, that would be one of the least performant options, particularly when dealing with a large number of events, because the operation fetching events would still need to be triggered on all navigation, as well as the whole cached array of events would need to be compared to the (potentially duplicate) fetched events.

An improvement would be to cache the events on "view" level, i.e. per `month`, `year` etc. The events would be fetched in either `beforeRender` or `afterRender`. A callback triggered on `switchView` would exchange the events rendered in the calendar calling `setEvents()`. An example of this concept can be found in the [Storybook demos](https://clndr2.snater.com/demos).

## Constraints & Date Pickers

For creating a datepicker or to prevent users from *nexting* all the way to 2034 in the calendar, the `constraints` options can be set with `start`, `end`, or both specified:

```typescript
new Clndr(container, {
  render: data => {/*...*/},
  constraints: {
    start: '1992-10-15',
    end: '2024-10-15',
  }
});
```

This causes the calendar's next and previous buttons to only work within this date range. When they become disabled they will have the class `inactive` applied to them, which can be used to make them appear disabled.

The items in the grid that are outside the current page's range, e.g. days of an adjacent month, will also have the `inactive` class applied to them. Therefore, the click callbacks provided to relevant `on` callbacks should check whether an item has the class `inactive` applied:

```typescript
new Clndr(container, {
  render: data => {/*...*/},
  constraints: {
    start: '1992-10-15',
    end: '2024-10-15',
  },
  on: {
    click: target => {
      if (target.element.classList.contains('inactive')) {
        console.log('You picked a valid date!');
        return;
      }

      console.log('That date is outside of the range.');
      /*...*/
    }
  }
});
```

## Internationalization

CLNDR2 has support for internationalization insofar as date-fns supports it. A date-fns locale may be passed to a calendar instance using the `locale` option. This will have the following effects:
- If neither `daysOfTheWeek`, nor `formatWeekdayHeader` option is provided, the weekday abbreviations for the calendar header row will be guessed using the date-fns locale.
- The `format` function passed to the template is a proxy for the date-fns `format` function, injected with the `locale ` by default.

For applying additional internationalization, the `extras` option can be used to pass in required functionality. 

## Key Differences to CLNDR

- The source code was completely recoded with a new, modular architecture and is now written in TypeScript rather than JavaScript.
- Instead of a jQuery plugin, CLNDR2 provides a `Clndr` class per an ES module.
- The dependency on jQuery is removed.
- The moment dependency is replaced by date-fns.
- There is no soft dependency on Underscore anymore, the `template` option as well as the default template was removed. You just have to provide your own `render` function.
- CLNDR2 supports asynchronously updating the calendar events.
- CLNDR2 supports multiple views that may be switched between.
- There are now [Storybook demos](https://clndr2.snater.com/demos) and there is [source code documentation](https://clndr2.snater.com/docs).
- The source code is automatically tested with a 100% code coverage.

### Migrate from CLNDR to CLNDR2

First of all, along with installing CLNDR2, you will also have to install [date-fns](https://date-fns.org/), which is supposed to be installed automatically as peer dependency.

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

- While version 1.x of CLNDR2 was very close to CLNDR in terms of the public API (options, public methods), version 2.x has not only turned internals upside down, but also the public interface. In fact, version 2.x does not have much in common with the original CLNDR as it has been recoded bottom up. Therefore, you might want to consult the [migration notes of CLNDR2 version 1.x to 2.x](https://github.com/Snater/CLNDR2/releases/tag/v2.0.0).
- The `template` option was removed to be even less opinionated about your template engine. Therefore, you now *have to* use the `render` option for hooking up your template engine of choice.
- In contrast to moment, date-fns is less opinionated about localisation. The consequence is that when setting a locale on date-fns, this does not automatically configure the day a week starts with. Therefore, you have to use the `weekStartsOn` option if you would like to have the week start with a day other than Sunday.
- In CLNDR, the moment object was passed into the template along all template data. In CLNDR2, The only date specific function passed to the template is `format`, which is a proxy to [date-fns' `format` function](https://date-fns.org/docs/format) with the locale defaulting to the locale provided per the new `locale` CLNDR2 option. No other date functions are passed to the template. If you want to use date functions in your template, i.e. for date calculations, provide those using the `extras` option.
- date-fns operates on standard `Date` objects. Passing moment objects to CLNDR2 will not work.
- If you want CLNDR2 to localize the day heading and the month name passed to the template, provide a date-fns locale per the new `locale` option.


[npm-url]: https://www.npmjs.com/package/clndr2
[npm-version-image]: https://badge.fury.io/js/clndr2.svg

[github-action-image]: https://github.com/Snater/CLNDR2/actions/workflows/test.yml/badge.svg
[github-action-url]: https://github.com/Snater/CLNDR2/actions/workflows/test.yml

[test-coverage-url]: https://codecov.io/gh/Snater/CLNDR2
[test-coverage-image]: https://codecov.io/gh/Snater/CLNDR2/branch/main/graph/badge.svg
