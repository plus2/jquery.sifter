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
    }
  });
  
  $.fn.filterList.defaults = {
    selector: 'li a',
    groupedBy: 'ul',
    clearFiltersSelector: '.clear-filters',
    useHeadingTogglers: false,
    headingSelector: 'h5 a',
    filterTypeRegexp: /^(\w+)\-/,
    beforeUpdate: null
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
        f.trigger(f.hasClass('active') === true ? 'fl:deactivate' : 'fl:activate');
        e.preventDefault();
      })
      .live('fl:activate', activateFilter)
      .live('fl:deactivate', deactivateFilter);
  }
  
  function updateActiveFilters () {
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
    // Emit that this happened
    container.trigger("fl:filtersUpdated", [active]);
  }
  
  function clearFilters () {
    deactivateAll();
    updateActiveFilters();
    return false;
  }
  
  function deactivateAll () {
    filters.removeClass('active');
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
    hasContents: hasContents
  });
  
  $.fn.filteredList.defaults = {
    filteredSelector: 'tbody > tr',
    afterRender: null,
    beforeRender: null,
    activateOnSetup: true
  };
  
  function setup () {
    container = $(this);  // This will probably be a table
    // Set this up
    $.data(container, 'activeFilters', []);
    // Note that it's filtered
    container.addClass("filtered");
    // Setup the rows
    filtered = $(opts.filteredSelector, container).filter(':not(.empty-message)');
    setupFiltered();
    // Take note of parent element
    parent = $(filtered[0]).parent();
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
  
  function activateAll () {
    filtered
      .detach()
      .addClass('active')
      .appendTo(parent);
  }

  function deactivateAll () {
    filtered
      .detach()
      .removeClass('active')
      .appendTo(parent);
  }
  
  function activateItem () {
    $(this).addClass('active');
  }
  
  function deactivateItem () {
    $(this).removeClass('active');
  }
  
  function getActive () {
    return $.data(container, 'activeFilters');
  }
  
  function render () {
    // Expensive. Queue it.
    $(document)
      .queue('sifter', function() {
        var active, rows, els;
        // Run before callback
        if ($.isFunction(opts.beforeRender)) {
          opts.beforeRender.apply(container);
        }
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
          parent.append(detached);
        } else {
          // If no filters are set, we're going to ensure everything is active
          activateAll();
        }
        // Run after callback
        if ($.isFunction(opts.afterRender)) {
          opts.afterRender.apply(container);
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
    filteredList = $(opts.filteredList);
    filterList = $(opts.filterList);
    // Set up the plugins
    // We're queueing these because it can get slow when dealing 
    // with a lot of data
    $(document)
      .queue('sifter', function() {
        filteredList.filteredList(opts.filteredListOpts);
        $(this).dequeue('sifter');
      })
      .delay(100, 'sifter')
      .queue('sifter', function() {
        filterList.filterList(opts.filterListOpts);
        $(this).dequeue('sifter');
      })
      .delay(100, 'sifter')
      .dequeue('sifter');
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
