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
    filterTypeRegexp: /^(\w+)\-/
  };
  
  function setup () {
    // Container should be a UL with child LIs containing their own
    // UL with child LI filters
    container = $(this);
    // By default, there are no active filters
    container
      .data("activeFilters", [])
      .addClass("isFilterList");
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
  
  var opts, container, filtered;
  
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
    filteredSelector: "tbody > tr",
    afterRender: null
  };
  
  function setup () {
    container = $(this);  // This will probably be a table
    // Set this up
    container.data("activeFilters", []);
    // Note that it's filtered
    container.addClass("filtered");
    // Setup the rows
    filtered = $(opts.filteredSelector, container).filter(':not(.empty-message)');
    setupFiltered();
    // Bind the custom render method
    container.bind("fl:render", render);
  }
  
  function setupFiltered () {
    filtered
      .live("fl:activate", activateItem)
      .live("fl:deactivate", deactivateItem);
    // Visible by default, so let's make sure
    activateAll();
  }
  
  function activateAll () {
    filtered.addClass('active');
  }
  
  function activateItem () {
    $(this).addClass('active');
  }
  
  function deactivateItem () {
    $(this).removeClass('active');
  }
  
  function render () {
    var active, rows;
    if (hasActiveFilters() === true) {
      active = container.data("activeFilters"); // Fetch the active filters
      filtered.each(deactivateItem); // Loop through all rows and deactivate
      rows = filtered; // Make a copy of filtered
      // Loop through all filter groups. 'this' is an array of class names.
      $.each(active, function() {
        var selector = '.' + this.join(',.'); // Selector for the filters
        rows = rows.filter(selector); // Reduce stored rows by selector
      });
      // Make rows unique and then activate those that remain
      $(rows).each(activateItem);
    } else {
      // If no filters are set, we're going to ensure everything is active
      activateAll();
    }
    // Run callback
    if ($.isFunction(opts.afterRender)) {
      opts.afterRender.apply(container);
    }
  }
  
  function hasActiveFilters () {
    var active = container.data("activeFilters");
    return $.isArray(active) && active.length > 0;
  }
  
  function hasContents () {
    return filtered.length > 0;
  }
  
  function setActiveFilters (filters) {
    if ($.isArray(filters)) {
      container
        .data("activeFilters", filters)
        .trigger("fl:render");
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
    filteredListOpts: {}
  };
  
  function setup () {
    // Store some key elements
    container = $(this);
    filteredList = $(opts.filteredList);
    filterList = $(opts.filterList);
    // Set up the plugins
    filteredList.filteredList(opts.filteredListOpts);
    filterList.filterList(opts.filterListOpts);
    // When we hear this event, we're going to work
    container.bind(opts.filterUpdateEvent, applyActiveFilters);
  }
  
  // Move the active filter list filters to the filtered list
  function applyActiveFilters (event, activeFilters) {
    // Make sure that we have results to filter
    if ($.isArray(activeFilters) && filteredList.hasContents() === true) {
      filteredList.setActiveFilters(activeFilters);
    }
  }
  
}(jQuery));
