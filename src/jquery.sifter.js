//
// Filter list plugin, used for the facets
//
(function($) {
  
  var opts, container, groups, filters;
  
  $.fn.extend({
    filterList: function(options) {
      opts = $.extend({}, $.fn.filterList.defaults, options);
      if (this.length) {
        return this.each(setupFilters);
      }
    }
  });
  
  $.fn.filterList.defaults = {
    selector: 'li a',
    groupedBy: 'ul',
    clearFiltersSelector: '.clear-filters',
    useHeadingTogglers: false,
    headingSelector: 'h5 a'
  };
  
  function setupFilters () {
    // Container should be a UL with child LIs containing their own
    // UL with child LI filters
    container = $(this);
    // By default, there are no active filters
    container
      .data("activeFilters", [])
      .addClass("isFilterList")
      .bind("fl:activate fl:deactivate", updateActiveFilters); // Update what filters are active upon changes
    // Find the filter groups
    groups = container.find(opts.groupedBy);
    // Work on the filters themselves
    filters = container.find(opts.selector);
    filters.each(setupFilter);
    // Set up clear filter link
    $(opts.clearFiltersSelector).live("click keypress", clearFilters);
    // We may want to use the filter headings to toggle visibility
    setupHeadingTogglers();
  }
  
  function setupFilter () {
    var filter = $(this);
    if (filter.hasClass('ignore') === false && filter.data('setup') !== true) {
      // Called on an individual filter, which in the case of the
      // image bank browse interface, is an anchor tag
      filter.data("active", false);  // Inactive by default
      // Trigger state change with mouse or keyboard
      filter.bind("click keypress", function(e) {
        e.preventDefault();
        if ($(this).data("active") === true) {
          $(this).trigger("fl:deactivate");
        } else {
          $(this).trigger("fl:activate");
        }
      });
      // Bind to the custom events
      // Using custom events instead of just putting this code in the toggle
      filter
        .bind("fl:activate", activateFilter)
        .bind("fl:deactivate", deactivateFilter)
        .data("setup", true); // Record that it has been set up
    }
  }
  
  function updateActiveFilters () {
    // Find all active filters and store data about them on the container
    var activeFilters = [];
    groups.each(function(i) {
      var grouped = [];
      $(this).find(opts.selector).each(function() {
        var el = $(this);
        if (el.data('active') === true) {
          grouped.push(el.attr('id'));
        }
      });
      if (grouped.length) {
        activeFilters.push(grouped);
      }
    });
    // Emit that this happened
    container.trigger("fl:filtersUpdated", [activeFilters]);
  }
  
  function clearFilters () {
    filters.each(deactivateFilter);
    updateActiveFilters();
    return false;
  }
  
  function deactivateFilter () {
    $(this)
      .data("active", false)
      .removeClass("active");
  }
  
  function activateFilter () {
    $(this)
      .data("active", true)
      .addClass("active");
  }
  
  function setupHeadingTogglers () {
    if (opts.useHeadingTogglers === true) {
      container.find(opts.headingSelector).each(function() {
        var header = $(this);
        // The parent should be the parent of both the header and the filters in this category
        header.parent().parent()
          .data("active", true)
          .addClass("active");
        header.bind("click keypress", function() {
          var parent = header.parent().parent();
          parent
            .toggleClass("active")
            .data("active", !(parent.data("active") === true));
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
    filtered = container.find(opts.filteredSelector);
    filtered.each(setupItem);
    // Bind the custom render method
    container.bind("fl:render", render);
  }
  
  function setupItem () {
    var item = $(this); // Item is probably a row
    // Bind to some custom events for activation and deactivation
    item
      .bind("fl:activate", activateItem)
      .bind("fl:deactivate", deactivateItem);
    // Visible by default, so let's make sure
    item.trigger("fl:activate");
  }
  
  function activateItem () {
    $(this)
      .data("active", true)
      .addClass("active");
  }
  
  function deactivateItem () {
    $(this)
      .data("active", false)
      .removeClass("active");
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
      filtered.trigger("fl:activate");
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
    return filtered.filter(':not(.empty-message)').length > 0;
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
