describe("jquery.sifter", function() {
  
  beforeEach(function() {
    setFixtures('<div id="sifted"><ul id="filterList"><li><ul><li><a id="filter1">Filter 1</a></li></ul></li></ul><table id="filteredList"><tbody><tr class="filter1"><td>Hello</td></tr></tbody></table></div>');
    $('#sifted').sifter();
  });
  
  it('should add classes to the components', function() {
    expect($('#filterList').hasClass('isFilterList')).toEqual(true);
    expect($('#filteredList').hasClass('filtered')).toEqual(true);
  });
    
  it('should add data properties to the components', function() {
    expect($.isArray($('#filterList').data('activeFilters'))).toEqual(true);
    expect($.isArray($('#filteredList').data('activeFilters'))).toEqual(true);
  });
  
  it('should add methods to filtered component', function() {
    expect($.isFunction($('#filteredList').setActiveFilters)).toEqual(true);
    expect($.isFunction($('#filteredList').hasContents)).toEqual(true);
  });
  
});
