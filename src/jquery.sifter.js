(function() {
  var __bind = function(func, context) {
    return function(){ return func.apply(context, arguments); };
  };
  (function($) {
    var Facets, FilteredList, Sifter;
    $.fn.extend({
      facets: function(opts) {
        var instance;
        if (instance = this.data("facets")) {
          this.removeData("facets");
        }
        return this.each(function() {
          var el;
          el = $(this);
          instance = new Facets(el, opts);
          return el.data("facets", instance);
        });
      }
    });
    Facets = function(el, opts) {
      this.opts = $.extend(true, {}, this.defaults, opts);
      this.container = $(el);
      this.container.addClass("isFilterList");
      this.groups = this.container.find(this.opts.groupedBy);
      this.filters = this.$("" + (this.opts.selector) + " :not(.ignore)");
      this.setupFilters();
      _.bindAll(this, 'clearFilters', 'updateActiveFilters');
      $(this.opts.clearFiltersSelector).live('click keypress', this.clearFilters);
      this.container.bind("fl:activate fl:deactivate", this.updateActiveFilters);
      this.setupHeadingTogglers();
      if ($.isFunction(this.opts.afterSetup)) {
        this.opts.afterSetup.apply(this);
      }
      return this;
    };
    Facets.prototype.defaults = {
      selector: 'li a',
      groupedBy: 'ul',
      clearFiltersSelector: '.clear-filters',
      useHeadingTogglers: false,
      headingSelector: 'h5 a',
      filterTypeRegexp: /^(\w+)\-/,
      beforeUpdate: null,
      afterSetup: null,
      afterClear: null
    };
    Facets.prototype.$ = function(selector) {
      return $(selector, this);
    };
    Facets.prototype.setupFilters = function() {
      return filters.live('click keypress', function(e) {
        var _a, f;
        f = $(this);
        if (f.hasClass('radio')) {
          if (f.hasClass('active')) {
            f.parent().parent().find('.radio.active').trigger('fl:deactivate', true);
            f.trigger('fl:activate');
          }
        } else {
          f.trigger((typeof (_a = f.hasClass('active')) !== "undefined" && _a !== null) ? _a : {
            'fl:deactivate': 'fl:activate'
          });
        }
        return e.preventDefault();
      }).live('fl:activate', this.activateFilter).live('fl:deactivate', this.deactivateFilter);
    };
    Facets.prototype.updateActiveFilters = function(e, noUpdate) {
      var active, activeFilters, grouped;
      if ($.isFunction(this.opts.beforeUpdate)) {
        this.opts.beforeUpdate.apply(this);
      }
      activeFilters = this.filters.filter('.active');
      grouped = {};
      active = [];
      activeFilters.each(__bind(function(el) {
        var id, type;
        el = $(el);
        if (id = el.attr('id')) {
          if (type = id.match(this.opts.filterTypeRegexp)) {
            if (!($.isArray(grouped[type]))) {
              grouped[type] = [];
            }
            return grouped[type].push(id);
          }
        }
      }, this));
      $.each(grouped, function(k, v) {
        return active.push(v);
      });
      return !(noUpdate) ? container.trigger("fl:filtersUpdated", [this, active]) : null;
    };
    Facets.prototype.clearFilters = function() {
      this.deactivateAll();
      this.updateActiveFilters();
      if ($.isFunction(this.opts.afterClear)) {
        this.opts.afterClear.apply(this.container);
      }
      return false;
    };
    Facets.prototype.deactivateAll = function() {
      return this.filters.filter(':not(.radio)').removeClass('active');
    };
    Facets.prototype.deactivateFilter = function() {
      return $(this).removeClass('active');
    };
    Facets.prototype.activateFilter = function() {
      return $(this).addClass('active');
    };
    Facets.prototype.setupHeadingTogglers = function() {
      return this.opts.useHeadingTogglers ? this.container.find(opts.headingSelector).each(__bind(function(el) {
        var header;
        header = $(el);
        header.parent().parent().data('active', true).addClass('active');
        return header.bind("click keypress", function() {
          var parent;
          parent = header.parent().parent();
          return parent.toggleClass('active').data('active', !(parent.data('active')));
        });
      }, this)) : null;
    };
    $.fn.extend({
      filteredList: function(opts) {
        var instance;
        if (instance = this.data("filteredList")) {
          this.removeData("filteredList");
        }
        return this.each(function() {
          var el;
          el = $(this);
          instance = new FilteredList(el, opts);
          return el.data("filteredList", instance);
        });
      }
    });
    FilteredList = function(el, opts) {
      this.opts = $.extend(true, {}, this.defaults, opts);
      this.container = $(this);
      $.data(container, 'activeFilters', {});
      this.container.addClass("filtered");
      this.cacheFiltered();
      this.parent = $(this.filtered.first()).parent();
      this.setupFiltered();
      _.bindAll(this, 'render');
      this.container.bind("fl:render", this.render);
      if ($.isFunction(this.opts.afterSetup)) {
        this.opts.afterSetup.apply(this);
      }
      return this;
    };
    FilteredList.prototype.defaults = {
      filteredSelector: 'tbody > tr',
      afterSetup: null,
      afterRender: null,
      beforeRender: null,
      activateOnSetup: true,
      siblings: true
    };
    FilteredList.prototype.setupFiltered = function() {
      this.filtered.live("fl:activate", this.activateItem).live("fl:deactivate", this.deactivateItem);
      return this.opts.activateOnSetup ? this.activateAll() : null;
    };
    FilteredList.prototype.cacheFiltered = function() {
      this.filtered = $(this.opts.filteredSelector, this.container).filter(':not(.empty-message)');
      return !(this.opts.siblings) ? this.filtered.each(function() {
        var item;
        item = $(this);
        return item.data('parent', item.parent());
      }) : null;
    };
    FilteredList.prototype.putBack = function(collection) {
      collection = collection || this.filtered;
      return this.opts.siblings ? collection.appendTo(this.parent) : collection.each(function() {
        var item;
        item = $(this);
        return item.data('parent').append(item);
      });
    };
    FilteredList.prototype.activateAll = function() {
      filtered.detach().addClass('active');
      return this.putBack();
    };
    FilteredList.prototype.deactivateAll = function() {
      filtered.detach().removeClass('active');
      return this.putBack();
    };
    FilteredList.prototype.activateItem = function() {
      return $(this).addClass('active');
    };
    FilteredList.prototype.deactivateItem = function() {
      return $(this).removeClass('active');
    };
    FilteredList.prototype.render = function() {
      return $(document).queue('sifter', function() {
        var run_render;
        run_render = function() {
          var detached, els, rows;
          if (this.hasActiveFilters()) {
            rows = (detached = this.filtered.detach());
            $.each(this.getActive(), function() {
              var selector;
              if ($.isArray(this)) {
                selector = '.' + this.join(',.');
                return (rows = rows.filter(selector));
              } else if ($.isFunction(this)) {
                return (rows = $($.grep(rows.get(), this)));
              }
            });
            els = rows.get();
            detached.each(function() {
              var el;
              el = $(this);
              return $.inArray(this, els) >= 0 ? (!(el.hasClass('active')) ? el.addClass('active') : null) : (el.hasClass('active') ? el.removeClass('active') : null);
            });
            this.putBack(detached);
          } else {
            this.activateAll();
          }
          return $.isFunction(this.opts.afterRender) ? this.opts.afterRender.apply(this) : null;
        };
        if ($.isFunction(this.opts.beforeRender)) {
          this.opts.beforeRender.apply(this, [run_render]);
        } else {
          run_render();
        }
        return $(this).dequeue('sifter');
      }).delay(100, 'sifter').dequeue('sifter');
    };
    FilteredList.prototype.hasActiveFilters = function() {
      var active;
      active = this.getActive();
      return $.isArray(active) && active.length > 0;
    };
    FilteredList.prototype.hasContents = function() {
      return this.filtered.length > 0;
    };
    FilteredList.prototype.setActiveFilters = function(filters) {
      return this.setActiveFiltersFromSource(filters, '*');
    };
    FilteredList.prototype.setActiveFiltersFromSource = function(filters, source) {
      var filtersBySource;
      filtersBySource = $.data(this.container, 'activeFilters') || {};
      if ($.isArray(filters) || $.isFunction(filters)) {
        filtersBySource[source] = filters;
        $.data(this.container, 'activeFilters', filtersBySource);
        return this.container.trigger("fl:render");
      } else if (filters === null) {
        delete filtersBySource[source];
        $.data(this.container, 'activeFilters', filtersBySource);
        return this.container.trigger("fl:render");
      }
    };
    FilteredList.prototype.getActive = function() {
      var filters, flatFilters;
      filters = $.data(this.container, 'activeFilters');
      flatFilters = [];
      if ($.isPlainObject(filters)) {
        $.each(filters, function(k, value) {
          return ($.isArray(value)) ? $.merge(flatFilters, value) : flatFilters.push(value);
        });
        return flatFilters;
      } else {
        return [];
      }
    };
    Sifter = function() {
      var container, filterList, filteredList;
      container = $(this);
      filteredList = container.find(opts.filteredList);
      filterList = container.find(opts.filterList);
      filteredList.filteredList(opts.filteredListOpts);
      filterList.filterList(opts.filterListOpts);
      container.bind(opts.filterUpdateEvent, applyActiveFilters);
      if ($.isFunction(opts.afterSetup)) {
        opts.afterSetup.apply(container);
      }
      return this;
    };
    Sifter.prototype.defaults = {
      filterList: '#filterList',
      filteredList: '#filteredList',
      filterUpdateEvent: 'fl:filtersUpdated',
      filterListOpts: {},
      filteredListOpts: {},
      afterSetup: null
    };
    Sifter.prototype.applyActiveFilters = function(event, source, activeFilters) {
      return ($.isArray(activeFilters) && filteredList.hasContents() === true) ? $(document).queue('sifter', function() {
        filteredList.setActiveFiltersFromSource(activeFilters, source);
        return $(this).dequeue('sifter');
      }).dequeue('sifter') : null;
    };
    return Sifter;
  })(jQuery);
})();
