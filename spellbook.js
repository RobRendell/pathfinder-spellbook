
String.prototype.toId = function() {
    return this.replace(/[^a-zA-Z0-9]/g, '_');
}

String.prototype.toTitleCase = function () {
    return this.replace(/\w\S*/g, function (match) {
        return match.charAt(0).toUpperCase() + match.substr(1).toLowerCase();
    });
}

var Class = {
    create: function(settings) {
        var newClass = function() {
            this.init.apply(this, arguments);
        }
        newClass.prototype.init = function() {};
        $.extend(newClass.prototype, settings);
        return newClass;
    }
};

var Storage = Class.create({

    currentVersion: 1,

    init: function (name, basePrefix) {
        this.basePrefix = basePrefix || 'pathfinder.spellbook.';
        this.name = name || '';
        this.prefix = this.basePrefix + this.name + '.';
        this.updaters = [];
        if (!this.supportsLocalStorage())
        {
            this.data = {};
            this.isLocalStorage = false;
            alert("Local storage not available in your browser - changes will be lost when you leave.");
        }
        else
        {
            this.data = localStorage;
            this.isLocalStorage = true;
        }
    },

    supportsLocalStorage: function() {
        return ('localStorage' in window && window['localStorage'] !== null);
    },

    setDefault: function (name, value) {
        if (this.get(name) === undefined) {
            this.set(name, value);
        }
    },

    set: function (name, value) {
        if (value instanceof Array)
            value = value.join("|");
        this.data[this.prefix + name] = value;
        $('input[name="' + name + '"]').val(value);
    },

    get: function (name) {
        return this.data[this.prefix + name];
    },

    getInt: function (name) {
        return parseInt(this.get(name));
    },

    getArray: function (name) {
        var result = this.data[this.prefix + name];
        if (result)
            return result.split("|");
        else
            return [];
    },

    clear: function (name) {
        var value = this.data[this.prefix + name];
        if (this.isLocalStorage)
            this.data.removeItem(this.prefix + name);
        else
            delete(this.data[this.prefix + name]);
        return value;
    },

    clearAll: function () {
        var keys = this.getKeys();
        $.each(keys, $.proxy(function (index, key) {
            this.clear(key);
        }, this));
    },

    getKeys: function () {
        if (this.isLocalStorage)
        {
            var result = [];
            for (var index = 0; index < this.data.length; ++index)
            {
                var key = this.data.key(index);
                if (key.indexOf(this.prefix) == 0)
                {
                    key = key.substring(this.prefix.length);
                    result.push(key);
                }
            }
            return result;
        }
        else
            return Object.keys(this.data);
    },

    changeId: function (oldId, newId, remove) {
        var keys = this.getKeys();
        $.each(keys, $.proxy(function (index, key)
        {
            if (key.indexOf(oldId) == 0)
            {
                var value = this.clear(key)
                if (!remove)
                {
                    var newKey = newId + key.substring(oldId.length);
                    this.set(newKey, value);
                }
            }
        }, this));
    },

    renameName: function (name) {
        name = name || '';
        var oldPrefix = this.name.toId() + '.';
        var newPrefix = name.toId() + '.';
        this.prefix = this.basePrefix;
        this.changeId(oldPrefix, newPrefix, false);
        this.setName(name);
    },

    setName: function (name) {
        name = name || '';
        this.name = name;
        this.prefix = this.basePrefix + this.name.toId() + '.';
        this.updateData();
    },

    removeName: function () {
        var oldPrefix = this.name.toId() + '.';
        this.prefix = this.basePrefix;
        this.changeId(oldPrefix, '', true);
    },

    setUpdater: function (version, updater) {
        this.updaters[version] = updater;
        if (this.currentVersion <= version) {
            this.currentVersion = version + 1;
        }
    },

    updateData: function () {
        var loadVersion = this.get('version') || 1;
        while (loadVersion < this.currentVersion) {
            var updater = this.updaters[loadVersion];
            if (updater) {
                $.each(this.getKeys(), $.proxy(function (index, oldKey) {
                    var update = updater(oldKey, this.get(oldKey));
                    if (update) {
                        this.clear(oldKey)
                        this.set(update[0], update[1]);
                    }
                }, this));
            }
            loadVersion++;
        }
        this.set('version', this.currentVersion);
    }

});

var SpellData = Class.create({

    fixedHeadings: [ 'name', 'school', 'subschool', 'descriptor',
        'spell_level', 'casting_time', 'components', 'costly_components',
        'range', 'area', 'effect', 'targets', 'duration', 'dismissible',
        'shapeable', 'saving_throw', 'spell_resistence', 'description',
        'description_formated', 'source', 'full_text', 'verbal', 'somatic',
        'material', 'focus', 'divine_focus', 'deity', 'SLA_Level', 'domain',
        'short_description', 'acid', 'air', 'chaotic', 'cold', 'curse',
        'darkness', 'death', 'disease', 'earth', 'electricity', 'emotion',
        'evil', 'fear', 'fire', 'force', 'good', 'language_dependent',
        'lawful', 'light', 'mind_affecting', 'pain', 'poison', 'shadow',
        'sonic', 'water', 'linktext', 'id', 'material_costs', 'bloodline',
        'patron', 'mythic_text', 'augmented', 'mythic' ],

    init: function (headings, rawData) {
        this.headings = headings;
        this.rawData = rawData;
        this.classNames = { 'wiz': 'Wizard', 'sor': 'Sorcerer'};
        $.each(headings, $.proxy(function (index, value) {
            if ($.inArray(value, this.fixedHeadings) < 0) {
                if (!this.classNames[value]) {
                    this.classNames[value] = value.toTitleCase();
                }
            }
        }, this));
        this.classHeadings = Object.keys(this.classNames).sort()
        this.classesForSources = {
            'PFRPG Core': [ 'adept', 'bard', 'cleric', 'druid', 'paladin', 'ranger', 'sor', 'wiz' ],
            'APG': [ 'alchemist', 'inquisitor', 'oracle', 'summoner', 'witch' ]
        };
        $.each(rawData, $.proxy(function (index, spell) {
            if (!this.classesForSources[spell.source] || $.isArray(this.classesForSources[spell.source])) {
                $.each(this.classHeadings, $.proxy(function (index, classHeading) {
                    if (spell[classHeading] == 'NULL') {
                        spell[classHeading] = null;
                    } else {
                        if (!this.classesForSources[spell.source]) {
                            this.classesForSources[spell.source] = {}
                        }
                        this.classesForSources[spell.source][classHeading] = 1
                    }
                }, this))
            }
        }, this));
        this.sources = Object.keys(this.classesForSources).sort($.proxy(this.sourceSort, this));
        $.each(this.sources, $.proxy(function (index, source) {
            if (!$.isArray(this.classesForSources[source])) {
                this.classesForSources[source] = Object.keys(this.classesForSources[source]);
            }
        }, this));
    },

    sourceSort: function (o1, o2) {
        o1 = this.sourceMunge(o1)
        o2 = this.sourceMunge(o2)
        if (o1 < o2) {
            return -1;
        } else if (o1 > o2) {
            return 1;
        } else {
            return 0;
        }
    },

    sourceMunge: function (sourceName) {
        if (sourceName == 'PFRPG Core') {
            return 'AAAA ';
        } else if (sourceName == 'APG') {
            return 'AAAB ';
        } else if (sourceName.startsWith('Ultimate ')) {
            return 'AAAC ' + sourceName;
        } else if (sourceName.startsWith('Advanced ')) {
            return 'AAAD ' + sourceName;
        } else {
            return sourceName;
        }
    },

    getClassHeadingsForSources: function (sourceList) {
        var result = {};
        $.each(sourceList, $.proxy(function (index, source) {
            $.each(this.classesForSources[source], function (index, classHeading) {
                result[classHeading] = 1;
            });
        }, this));
        return Object.keys(result);
    }

});

var BookKeys = {
    keyBookIDs: 'bookIDs',
    keyBookName: 'bookName',
    keySelectedSources: 'selectedSources',
    keySelectedClasses: 'selectedClasses'
};

var TopMenu = Class.create({

    defaultBookName: 'My Spellbook',

    init: function (globalSettings, spellData) {
        this.globalSettings = globalSettings;
        this.spellData = spellData;
        this.bookData = {};
        this.bookMenu = {};
        var bookIDs = globalSettings.getArray(BookKeys.keyBookIDs);
        $.each(bookIDs, $.proxy(function (index, bookID) {
            this.bookData[bookID] = new Storage(bookID);
        }, this));
        this.refresh();
        // Create new elements in sub-menus
        $.each(this.spellData.sources, function (index, source) {
            var sourceLine = $(`<label><input type="checkbox" id="source_${source.toId()}" name="${source}" class="sourcebook"> ${source}</label>`)
            $('#sourceItems').append(sourceLine);
        });
        $.each(this.spellData.classHeadings, function (index, classHeading) {
            var className = spellData.classNames[classHeading];
            var sourceLine = $(`<label class="characterClassLabel"><input type="checkbox" id="class_${classHeading.toId()}" name="${classHeading}" class="characterClass"> ${className}</label>`)
            $('#classItems').append(sourceLine);
        });
    },

    refresh: function () {
        var topdiv = $('#spellbooks');
        topdiv.off();
        topdiv.html('');
        this.addNewBookButton();
        $.each(this.bookData, $.proxy(function (id, storage) {
            this.addBookButton(id, storage);
        }, this));
        topdiv.fadeIn();
    },

    addNewBookButton: function () {
        var button = $('<div class="book"></div>');
        button.append($('<img src="newBook.png" />'));
        button.append($('<div></div>').text('New spellbook'));
        button.on('click touch', $.proxy(this.newSpellbookClicked, this));
        $('#spellbooks').append(button);
        this.newBookButton = button;
    },

    newSpellbookClicked: function (evt) {
        var id = this.getNewBookID();
        var storage = new Storage(id);
        this.bookData[id] = storage;
        this.globalSettings.set(BookKeys.keyBookIDs, Object.keys(this.bookData));
        storage.set(BookKeys.keyBookName, this.defaultBookName);
        this.addBookButton(id, storage);
    },

    getNewBookID: function () {
        var id;
        do {
            id = 'book' + Math.random().toFixed(8).substr(2);
        } while (this.bookData[id]);
        return id;
    },

    addBookButton: function (id, storage) {
        var text = storage.get(BookKeys.keyBookName);
        var button = $('<div class="book"></div>');
        button.attr('id', id);
        button.append($('<img src="book.png" />'));
        button.append($(`<div class="name_${id}"></div>`).text(text));
        button.on('click touch', $.proxy(this.spellbookClicked, this));
        this.newBookButton.before(button);
    },

    spellbookClicked: function (evt) {
        var target = evt.currentTarget;
        var id = $(target).attr('id');
        if (!this.bookMenu[id]) {
            this.bookMenu[id] = new BookMenu(id, this.bookData[id], this.spellData, this.globalSettings, this);
        }
        this.selectedBook = this.bookMenu[id]
        this.selectedBook.showMenu();
    },

    deleteBook: function (id) {
        this.bookData[id].clearAll();
        delete(this.bookData[id]);
        this.globalSettings.set(BookKeys.keyBookIDs, Object.keys(this.bookData));
    }

});

var BookMenu = Class.create({
    init: function (id, storage, spellData, globalSettings, topMenu) {
        this.id = id;
        this.storage = storage;
        this.spellData = spellData;
        this.globalSettings = globalSettings;
        this.topMenu = topMenu;
        this.currentView = 'menu';
    },

    showMenu: function () {
        $('#bookPanelTitle').removeClass();
        $('#bookPanelTitle').addClass(`name_${this.id}`)
        var bookName = this.storage.get(BookKeys.keyBookName);
        $('#bookPanelTitle').text(bookName);
        $('#spellbooks').fadeOut();
        $('#bookMenu').fadeIn();
        $('.back').on('click touch', $.proxy(this.back, this));
        $('#detailsButton').on('click touch', $.proxy(this.showDetailsPanel, this));
        this.currentView = 'menu';
        // Details panel setup
        $('#detailsAccordion').accordion({
            collapsible: true,
            active: false,
            heightStyle: "content"
        });
        $('.sourcebook').on('change', $.proxy(function (evt) {
            var checkbox = $(evt.target);
            this.refreshSelectedSources(checkbox.attr('name'), checkbox.prop('checked'));
        }, this));
        $('.characterClass').on('change', $.proxy(function (evt) {
            var checkbox = $(evt.target);
            this.refreshSelectedClasses(checkbox.attr('name'), checkbox.prop('checked'));
        }, this));
        $('#detailsPanelApply').on('click touch', $.proxy(this.onDetailsPanelApply, this));
        $('#detailsPanelDelete').on('click touch', $.proxy(this.onDetailsPanelDelete, this));
    },

    back: function () {
        $('.panel').fadeOut();
        if (this.currentView == 'menu') {
            $('#detailsAccordion').accordion('destroy');
            $('#book *').off();
            this.topMenu.refresh();
        } else {
            $('#bookMenu').fadeIn();
            this.currentView = 'menu';
        }
    },

    showDetailsPanel: function () {
        $('.panel').fadeOut();
        $('#detailsPanel').fadeIn();
        this.currentView = 'detailsPanel';
        $('#spellbookNameInput').val(this.storage.get(BookKeys.keyBookName));
        this.selectedSources = this.storage.getArray(BookKeys.keySelectedSources);
        this.selectedClasses = this.storage.getArray(BookKeys.keySelectedClasses);
        this.resetDetailsCheckboxes();
    },

    resetDetailsCheckboxes: function () {
        $('.sourcebook').prop('checked', false);
        $.each(this.selectedSources, function (index, source) {
            $(`#source_${source.toId()}`).prop('checked', true);
        });
        this.refreshSelectedSources();
        $('.characterclass').prop('checked', false);
        $.each(this.selectedClasses, function (index, characterClass) {
            $(`#class_${characterClass.toId()}`).prop('checked', true);
        });
        this.refreshSelectedClasses();
    },

    refreshSelectedSources: function (source, enabled) {
        this.changeSelection(this.selectedSources, source, enabled, $.proxy(this.spellData.sourceSort, this.spellData));
        if (this.selectedSources.length > 0) {
            $('#sourceNames').text('Source books: ' + this.selectedSources.join(', '));
        } else {
            $('#sourceNames').text('Source books: none selected');
        }
        // Only show classes that exist in the given sources, or that are already on
        var classHeadings = this.spellData.getClassHeadingsForSources(this.selectedSources);
        $('.characterClassLabel').hide();
        var showClass = $.proxy(function (index, classHeading) {
            $(`#class_${classHeading.toId()}`).parent().show();
        }, this);
        $.each(classHeadings, showClass);
        $.each(this.selectedClasses, showClass);
    },

    refreshSelectedClasses: function (classHeading, enabled) {
        this.changeSelection(this.selectedClasses, classHeading, enabled, undefined);
        if (this.selectedClasses.length > 0) {
            var classNames = this.selectedClasses.map($.proxy(function (key) {
                return this.spellData.classNames[key];
            }, this));
            $('#classNames').text('Character classes: ' + classNames.join(', '));
        } else {
            $('#classNames').text('Character classes: none selected');
        }
    },

    changeSelection: function (list, value, enabled, sortFn) {
        if (value) {
            if (enabled) {
                list.push(value);
                list.sort(sortFn);
            } else {
                var index = $.inArray(value, list);
                if (index >= 0) {
                    list.splice(index, 1);
                }
            }
        }
    },

    refreshSelection: function (label, element, list, value, enabled, sortFn) {
        if (list.length > 0) {
            element.text(label + list.join(', '));
        } else {
            element.text(label + 'none selected');
        }
    },

    onDetailsPanelApply: function (evt) {
        var newName = $('#spellbookNameInput').val();
        this.storage.set(BookKeys.keyBookName, newName);
        $(`.name_${this.id}`).text(newName);
        this.storage.set(BookKeys.keySelectedSources, this.selectedSources);
        this.storage.set(BookKeys.keySelectedClasses, this.selectedClasses);
        this.back();
    },

    onDetailsPanelDelete: function (evt) {
        var name = this.storage.get(BookKeys.keyBookName);
        if (window.confirm('Do you really want to delete "' + name + '"?  All saved configuration will be lost.')) {
            this.topMenu.deleteBook(this.id);
            this.currentView = 'menu';
            this.back();
        }
    }
});

//=========================================================================================


$(document).ready(function () {
    var globalSettings = new Storage();
    globalSettings.setDefault('dataSize', 8003493);
    $('#loadingMessage').text('Loading spell list from pathfindercommunity.net...');
    $('#progress').progressbar({ max: globalSettings.getInt('dataSize'), value: 0 });
    // Now load the data.
    /*
    $.ajax({
        url: 'https://spreadsheets.google.com/pub?key=0AhwDI9kFz9SddG5GNlY5bGNoS2VKVC11YXhMLTlDLUE&output=csv',
        xhr: function () {
            var xhr = new window.XMLHttpRequest();
            xhr.addEventListener('progress', function (evt) {
                $('#progress').progressbar('value', evt.loaded);
            });
            return xhr;
        }
    })
    .then(function (data) {
        $('#progress').progressbar('value', globalSettings.getInt('dataSize'));
        globalSettings.set('dataSize', data.length);
        $('#loading').fadeOut();
        return $.Deferred(function (defer) {
            $.csv.toObjects(data, {}, function (err, objects) {
                if (err) {
                    defer.reject(err);
                } else {
                    defer.resolve(data, objects);
                }
            });
        });
    })
    .then(function (data, spellList) {
        return $.Deferred(function (defer) {
            var headingRow = data.substring(0, data.search(/[\r\n]/));
            $.csv.toArray(headingRow, {}, function (err, headings) {
                if (err) {
                    defer.reject(err);
                } else {
                    defer.resolve(headings, spellList);
                }
            });
        });
    })
    .then(function (headings, spellList) {
        var spellData = new SpellData(headings, spellList);
        // TODO show current book (and book panel) as saved in globalSettings
        new TopMenu(globalSettings, spellData);
    })
    .fail(function (err) {
        $('#loading').text('Error: ' + err);
        $('#loading').fadeIn();
    });
    */
    $('.panel').hide();
    $.csv.toObjects(globalSpellCsv, {}, function (err, spellList) {
        if (err) {
            console.error(err);
        } else {
            var headingRow = globalSpellCsv.substring(0, globalSpellCsv.search(/[\r\n]/));
            $.csv.toArray(headingRow, {}, function (err, headings) {
                if (err) {
                    console.error(err);
                } else {
                    new TopMenu(globalSettings, new SpellData(headings, spellList));
                }
            });
        }
    });
});
