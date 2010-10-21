//
// Filter list plugin, used for the facets
//
(function($) {
  
  var opts, container, groups, filters;
  
  $.fn.extend({
    filterList: function(options) {
      opts = $.extend({}, $.fn.filterList.defaults, options);
      if (this.length) {
        return this.each(setup);
      }
    },
    updateActiveFilters: updateActiveFilters
  });
  
  $.fn.filterList.defaults = {
    selector: 'li a',
    groupedBy: 'ul',
    clearFiltersSelector: '.clear-filters',
    useHeadingTogglers: false,
    headingSelector: 'h5 a',
    filterTypeRegexp: /^(\w+)\-/,
    beforeUpdate: null,
    afterClear: null
  };
  
  function setup () {
    // Container should be a UL with child LIs containing their own
    // UL with child LI filters
    container = $(this);
    // Note that it's setup
    container.addClass("isFilterList");
    // Find the filter groups
    groups = container.find(opts.groupedBy);
    // Work on the filters themselves
    filters = $(opts.selector + ':not(.ignore)', container);
    setupFilters();
    // Set up clear filter link
    $(opts.clearFiltersSelector).live('click keypress', clearFilters);
    // Update what filters are active upon changes
    container.bind("fl:activate fl:deactivate", updateActiveFilters);
    // We may want to use the filter headings to toggle visibility
    setupHeadingTogglers();
  }
  
  function setupFilters () {
    // Bind to the user's events and some custom ones too
    filters.live('click keypress', function(e) {
        var f = $(this);
        // Check if this is a standard filter or a radio
        if (f.hasClass('radio') === true) {
          // If this is a radio filter:
          // - activate if inactive, and deactivate all others in the radio group
          // - ignore if active
          if (f.hasClass('active') === false) {
            // Find the other active in this radio group and deactivate
            // True here so we don't have 2 renders occurring, we'll just use the 2nd
            f.parent().parent().find('.radio.active').trigger('fl:deactivate', true);
            // Activate this one
            f.trigger('fl:activate');
          }
        } else {
          // If this is a standard filter, toggle between active and inactive
          f.trigger(f.hasClass('active') === true ? 'fl:deactivate' : 'fl:activate');
        }
        e.preventDefault();
      })
      .live('fl:activate', activateFilter)
      .live('fl:deactivate', deactivateFilter);
  }
  
  function updateActiveFilters (e, noUpdate) {
    // Callback
    if ($.isFunction(opts.beforeUpdate)) {
      opts.beforeUpdate.apply(container);
    }
    // Find all active filters and store data about them on the container
    var activeFilters = filters.filter('.active'),
        grouped = {},
        active = [];
    // Group by type into an object
    activeFilters.each(function() {
      var el = $(this),
          id = el.attr('id'),
          type;
      if (id) {
        type = id.match(opts.filterTypeRegexp);
        if (type) {
          if ($.isArray(grouped[type]) === false) {
            grouped[type] = [];
          }
          grouped[type].push(id);
        }
      }
    });
    // Turn the above collection into an array of arrays
    $.each(grouped, function(k, v) {
      active.push(v);
    });
    // Unless we've supplied event data requesting that this be ignored
    if (noUpdate !== true) {
      // Emit that this happened
      container.trigger("fl:filtersUpdated", [active]);
    }
  }
  
  function clearFilters () {
    deactivateAll();
    updateActiveFilters();
    if ($.isFunction(opts.afterClear)) {
      opts.afterClear.apply(container);
    }
    return false;
  }
  
  function deactivateAll () {
    filters.filter(':not(.radio)').removeClass('active');
  }
  
  function deactivateFilter () {
    $(this).removeClass('active');
  }
  
  function activateFilter () {
    $(this).addClass('active');
  }
  
  function setupHeadingTogglers () {
    if (opts.useHeadingTogglers === true) {
      container.find(opts.headingSelector).each(function() {
        var header = $(this);
        // The parent should be the parent of both the header and the filters in this category
        header.parent().parent()
          .data('active', true)
          .addClass('active');
        header.bind("click keypress", function() {
          var parent = header.parent().parent();
          parent
            .toggleClass('active')
            .data('active', !(parent.data('active') === true));
        });
      });
    }
  }

}(jQuery));

//
// Filtered list plugin, used on results table
//
(function($) {
  
  var opts, container, filtered, parent;
  
  $.fn.extend({
    filteredList: function(options) {
      opts = $.extend({}, $.fn.filteredList.defaults, options);
      if (this.length) {
        return this.each(setup);
      }
    },
    setActiveFilters: setActiveFilters,
    getActiveFilters: getActive,
    hasContents: hasContents,
    cacheFiltered: cacheFiltered,
    setup: setup
  });
  
  $.fn.filteredList.defaults = {
    filteredSelector: 'tbody > tr',
    afterRender: null,
    beforeRender: null,
    activateOnSetup: true,
    siblings: true
  };
  
  function setup () {
    container = $(this);  // This will probably be a table
    // Set this up
    $.data(container, 'activeFilters', []);
    // Note that it's filtered
    container.addClass("filtered");
    // Setup the rows
    cacheFiltered();
    parent = $(filtered.first()).parent();
    setupFiltered();
    // Bind the custom render method
    container.bind("fl:render", render);
  }
  
  function setupFiltered () {
    filtered
      .live("fl:activate", activateItem)
      .live("fl:deactivate", deactivateItem);
    if (opts.activateOnSetup === true) {
      // Visible by default, so let's make sure
      activateAll();
    }
  }
  
  function cacheFiltered () {
    filtered = $(opts.filteredSelector, container).filter(':not(.empty-message)');
    // If the filtered items aren't siblings, we're going to keep track of each one's parent
    if (opts.siblings === false) {
      filtered.each(function () {
        var item = $(this);
        // Find this item's parent and store a reference to it in data
        item.data('parent', item.parent());
      });
    }
  }

  // Puts a collection of items back into the DOM
  function putBack (collection) {
    collection = collection || filtered; // If a collection isn't supplied, use filtered
    // If the items are siblings, just chuck them in together under the parent
    // Otherwise, each one needs to be placed under its original parent
    if (opts.siblings === true) {
      collection.appendTo(parent);
    } else {
      collection.each(function () {
        var item = $(this);
        item.data('parent').append(item);
      });
    }
  }
  
  function activateAll () {
    filtered
      .detach()
      .addClass('active');
    putBack();
  }

  function deactivateAll () {
    filtered
      .detach()
      .removeClass('active');
    putBack();
  }
  
  function activateItem () {
    $(this).addClass('active');
  }
  
  function deactivateItem () {
    $(this).removeClass('active');
  }
  
  function render () {
    // Expensive. Queue it.
    $(document)
      .queue('sifter', function() {
        var active, detached, rows, els,
            run_render = function() {
              if (hasActiveFilters() === true) {
                active = getActive(); // Fetch the active filters
                detached = filtered.detach(); // Detach and make a copy of filtered
                rows = detached;
                // Loop through all filter groups. 'this' is an array of class names.
                $.each(active, function() {
                  var selector = '.' + this.join(',.'); // Selector for the filters
                  rows = rows.filter(selector); // Reduce stored rows by selector
                });
                // Make rows unique and then activate those that remain
                els = rows.get();
                detached.each(function() {
                  var el = $(this);
                  if ($.inArray(this, els) >= 0) {
                    if (el.hasClass('active') === false) {
                      el.addClass('active');
                    }
                  } else {
                    if (el.hasClass('active') === true) {
                      el.removeClass('active');
                    }
                  }
                });
                // Add back into the dom
                putBack(detached);
              } else {
                // If no filters are set, we're going to ensure everything is active
                activateAll();
              }
              // Run after callback
              if ($.isFunction(opts.afterRender)) {
                opts.afterRender.apply(container);
              }
            };
        // Run before callback
        if ($.isFunction(opts.beforeRender)) {
          opts.beforeRender.apply(container, [run_render]);
        } else {
          run_render();
        }
        
        $(this).dequeue('sifter');
      })
      .delay(100, 'sifter')
      .dequeue('sifter');
  }
  
  function hasActiveFilters () {
    var active = getActive();
    return $.isArray(active) && active.length > 0;
  }
  
  function hasContents () {
    return filtered.length > 0;
  }
  
  function setActiveFilters (filters) {
    if ($.isArray(filters)) {
      $.data(container, 'activeFilters', filters);
      container.trigger("fl:render");
    }
  }
  
  function getActive () {
    return $.data(container, 'activeFilters');
  }
  
}(jQuery));

//
// Sifter plugin, using both of the above plugins
//
(function($) {
  
  var opts, container, filteredList, filterList;
  
  $.fn.extend({
    sifter: function(options) {
      opts = $.extend(true, {}, $.fn.sifter.defaults, options);
      if (this.length) {
        return this.each(setup);
      }
    }
  });
  
  $.fn.sifter.defaults = {
    filterList: '#filterList',
    filteredList: '#filteredList',
    filterUpdateEvent: 'fl:filtersUpdated',
    filterListOpts: {},
    filteredListOpts: {},
    afterSetup: null
  };
  
  function setup () {
    // Store some key elements
    container = $(this);
    filteredList = container.find(opts.filteredList);
    filterList = container.find(opts.filterList);
    // Set up the plugins
    // We're queueing these because it can get slow when dealing 
    // with a lot of data
    filteredList.filteredList(opts.filteredListOpts);
    filterList.filterList(opts.filterListOpts);
    // When we hear this event, we're going to work
    container.bind(opts.filterUpdateEvent, applyActiveFilters);
    // Trigger callback
    if ($.isFunction(opts.afterSetup)) {
      opts.afterSetup.apply(container);
    }
  }
  
  // Move the active filter list filters to the filtered list
  function applyActiveFilters (event, activeFilters) {
    // Make sure that we have results to filter
    if ($.isArray(activeFilters) && filteredList.hasContents() === true) {
      // Delay this too
      $(document)
        .queue('sifter', function() {
          filteredList.setActiveFilters(activeFilters);
          $(this).dequeue('sifter');
        })
        .dequeue('sifter');
    }
  }
  
}(jQuery));
