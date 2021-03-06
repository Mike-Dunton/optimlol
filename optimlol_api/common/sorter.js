var _sort = function(arrayToSort, sortingKey, direction) {
	var _comparator = function(a, b) {
		if (a[sortingKey] < b[sortingKey]) {
			if (direction === "ascending") {
				return -1;
			} else {
				return 1;
			}
		} else if (a[sortingKey] > b[sortingKey]) {
			if (direction === "ascending") {
				return 1;
			} else {
				return -1;
			}
		} else {
			return 0;
		}
	};

	arrayToSort.sort(_comparator);
};

module.exports = {
	sort: _sort
}