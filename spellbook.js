
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
        // Lots of later books add Core and APG spells to their new classes, bloodlines and domains.
        this.classesForSources = {
            'PFRPG Core': [ 'adept', 'bard', 'cleric', 'druid', 'paladin', 'ranger', 'sor', 'wiz' ],
            'APG': [ 'alchemist', 'inquisitor', 'oracle', 'summoner', 'witch' ]
        };
        this.bloodlinesForSources = {
            'PFRPG Core': [ 'Aberrant', 'Abyssal', 'Arcane', 'Celestial', 'Destined', 'Draconic', 'Elemental', 'Fey',
                'Infernal', 'Undead' ],
            'APG': [ 'Aquatic', 'Boreal', 'Deepearth', 'Dreamspun', 'Protean', 'Serpentine', 'Shadow', 'Starsoul',
                'Stormborn', 'Verdant' ]
        };
        this.domainsForSources = {
            'PFRPG Core': [ 'Air', 'Animal', 'Artifice', 'Chaos', 'Charm', 'Community', 'Darkness', 'Death',
                'Destruction', 'Earth', 'Evil', 'Fire', 'Glory', 'Good', 'Healing', 'Knowledge', 'Law', 'Liberation',
                'Luck', 'Madness', 'Magic', 'Nobility', 'Plant', 'Protection', 'Repose', 'Rune', 'Strength', 'Sun',
                'Travel', 'Trickery', 'War', 'Water', 'Weather' ],
            'APG': [ 'Agathion', 'Ancestors', 'Arcane', 'Archon', 'Ash', 'Azata', 'Blood', 'Catastrophe', 'Caves',
                'Cloud', 'Construct', 'Curse', 'Daemon', 'Day', 'Decay', 'Deception', 'Defense', 'Demon', 'Devil',
                'Divine', 'Exploration', 'Family', 'Fate', 'Feather', 'Ferocity', 'Freedom', 'Fur', 'Growth',
                'Heroism', 'Home', 'Honor', 'Ice', 'Inevitable', 'Insanity', 'Language', 'Leadership', 'Light',
                'Loss', 'Love', 'Lust', 'Martyr', 'Memory', 'Metal', 'Murder', 'Night', 'Nightmare', 'Oceans',
                'Protean', 'Purity', 'Rage', 'Resolve', 'Restoration', 'Resurrection', 'Revolution', 'Seasons',
                'Smoke', 'Souls', 'Storms', 'Tactics', 'Thievery', 'Thought', 'Toil', 'Trade', 'Undead', 'Wards',
                'Wind' ]
        };
        this.patronsForSources = {
            'PFRPG Core': [],
            'APG': [ 'Agility', 'Animals', 'Deception', 'Elements', 'Endurance', 'Plague', 'Shadow', 'Strength',
                'Transformation', 'Trickery', 'Water', 'Wisdom' ]
        };
        this.buildResultMapsForSources([
            [ this.classesForSources, $.proxy(this.getClassesFromSpell, this) ],
            [ this.domainsForSources, $.proxy(this.getDomainsFromSpell, this) ],
            [ this.bloodlinesForSources, $.proxy(this.getBloodlinesFromSpell, this) ],
            [ this.patronsForSources, $.proxy(this.getPatronsFromSpell, this) ]
        ]);
        this.sources = Object.keys(this.classesForSources).sort($.proxy(this.sourceSort, this));
        this.domains = this.valuesFromSourceMap(this.domainsForSources).sort();
        this.bloodlines = this.valuesFromSourceMap(this.bloodlinesForSources).sort();
        this.patrons = this.valuesFromSourceMap(this.patronsForSources).sort();
        // Sanity check
        var thisclassesForSources = {};
        var thisdomainsForSources = {};
        var thisbloodlinesForSources = {};
        var thispatronsForSources = {};
        this.buildResultMapsForSources([
            [ thisclassesForSources, $.proxy(this.getClassesFromSpell, this) ],
            [ thisdomainsForSources, $.proxy(this.getDomainsFromSpell, this) ],
            [ thisbloodlinesForSources, $.proxy(this.getBloodlinesFromSpell, this) ],
            [ thispatronsForSources, $.proxy(this.getPatronsFromSpell, this) ]
        ]);
        var domains = this.valuesFromSourceMap(thisdomainsForSources).sort();
        var bloodlines = this.valuesFromSourceMap(thisbloodlinesForSources).sort();
        var patrons = this.valuesFromSourceMap(thispatronsForSources).sort();
        console.log(`domains: actual ${domains.length} vs correct core/apg ${this.domains.length}`);
        console.log(`bloodlines: actual ${bloodlines.length} vs correct core/apg ${this.bloodlines.length}`);
        console.log(`patrons: actual ${patrons.length} vs correct core/apg ${this.patrons.length}`);
    },

    getClassesFromSpell: function (spell, map) {
        if (!map) {
            map = {}
        }
        $.each(this.classHeadings, function (index, classHeading) {
            if (spell[classHeading] === 'NULL' || spell[classHeading] === null) {
                spell[classHeading] = null;
            } else {
                map[classHeading] = parseInt(spell[classHeading]);
            }
        });
        return map;
    },

    getDomainsFromSpell: function (spell, map) {
        return this.getLevelsFromSpellField(spell.domain, map);
    },

    getBloodlinesFromSpell: function (spell, map) {
        return this.getLevelsFromSpellField(spell.bloodline, map);
    },

    getPatronsFromSpell: function (spell, map) {
        return this.getLevelsFromSpellField(spell.patron, map);
    },

    getLevelsFromSpellField: function (field, map) {
        if (!map) {
            map = {};
        }
        if (field) {
            $.each(field.split(/, */), function (index, value) {
                var keyValueArray = value.match(/([^()]*?) \(([0-9]*)\)/);
                if (keyValueArray) {
                    map[keyValueArray[1]] = parseInt(keyValueArray[2]);
                } else {
                    console.error("Field didn't match expected pattern: " + value);
                }
            });
        }
        return map;
    },

    buildResultMapsForSources: function (resultMapsAndFnList) {
        $.each(this.rawData, function (index, spell) {
            $.each(resultMapsAndFnList, function (index, resultMapAndFn) {
                var resultMap = resultMapAndFn[0];
                var resultFn = resultMapAndFn[1];
                if (!resultMap[spell.source]) {
                    resultMap[spell.source] = {}
                }
                if (!$.isArray(resultMap[spell.source])) {
                    resultFn(spell, resultMap[spell.source]);
                }
            });
        });
        $.each(resultMapsAndFnList, function (index, resultMapAndFn) {
            var resultMap = resultMapAndFn[0];
            $.each(resultMap, function (source, value) {
                if (!$.isArray(value)) {
                    resultMap[source] = Object.keys(value);
                }
            });
        });
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

    valuesFromSourceMap: function (sourceMap, sourceList) {
        var result = {};
        if (!sourceList) {
            sourceList = Object.keys(sourceMap);
        }
        $.each(sourceList, $.proxy(function (index, source) {
            $.each(sourceMap[source], function (index, value) {
                result[value] = 1;
            });
        }, this));
        return Object.keys(result);
    },

    getClassHeadingsForSources: function (sourceList) {
        return this.valuesFromSourceMap(this.classesForSources, sourceList);
    }

});

var BookKeys = {
    keyBookIDs: 'bookIDs',
    keyBookName: 'bookName',
    keySelectedSources: 'selectedSources',
    keySelectedClasses: 'selectedClasses',
    keySelectedDomains: 'selectedDomains',
    keySelectedBloodlines: 'selectedBloodlines',
    keySelectedPatrons: 'selectedPatrons'
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
            var sourceLine = $(`<label class="classLabel"><input type="checkbox" id="class_${classHeading.toId()}" name="${classHeading}" class="characterClass"> ${className}</label>`)
            $('#classItems').append(sourceLine);
        });
        this.addOptionsToSelect(this.spellData.domains, 'domain');
        this.addOptionsToSelect(this.spellData.bloodlines, 'bloodline');
        this.addOptionsToSelect(this.spellData.patrons, 'patron');
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
    },

    addOptionsToSelect: function (valueList, prefix) {
        $.each(valueList, function (index, value) {
            var line = $(`<label class="${prefix}Label"><input type="checkbox" id="${prefix}_${value.toId()}" name="${value}" class="${prefix}"> ${value}</label>`)
            $(`#${prefix}Items`).append(line);
        });
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
        $('.domain').on('change', $.proxy(function (evt) {
            var checkbox = $(evt.target);
            this.changeSelection(this.selectedDomains, checkbox.attr('name'), checkbox.prop('checked'));
            this.refreshSelection('Domains: ', $('#domainChoice'), this.selectedDomains);
        }, this));
        $('.bloodline').on('change', $.proxy(function (evt) {
            var checkbox = $(evt.target);
            this.changeSelection(this.selectedBloodlines, checkbox.attr('name'), checkbox.prop('checked'));
            this.refreshSelection('Bloodlines: ', $('#bloodlineChoice'), this.selectedBloodlines);
        }, this));
        $('.patron').on('change', $.proxy(function (evt) {
            var checkbox = $(evt.target);
            this.changeSelection(this.selectedPatrons, checkbox.attr('name'), checkbox.prop('checked'));
            this.refreshSelection('Patrons: ', $('#patronChoice'), this.selectedPatrons);
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
        this.selectedDomains = this.storage.getArray(BookKeys.keySelectedDomains);
        this.selectedBloodlines = this.storage.getArray(BookKeys.keySelectedBloodlines);
        this.selectedPatrons = this.storage.getArray(BookKeys.keySelectedPatrons);
        this.resetDetailsCheckboxes();
    },

    resetDetailsCheckboxes: function () {
        this.resetCheckboxes('sourcebook', this.selectedSources, 'source');
        this.resetCheckboxes('characterclass', this.selectedClasses, 'class');
        this.resetCheckboxes('domain', this.selectedDomains, 'domain');
        this.resetCheckboxes('bloodline', this.selectedBloodlines, 'bloodline');
        this.resetCheckboxes('patron', this.selectedPatrons, 'patron');
        this.refreshSelectedSources();
        this.refreshSelectedClasses();
        this.refreshSelection('Domains: ', $('#domainChoice'), this.selectedDomains);
        this.refreshSelection('Bloodlines: ', $('#bloodlineChoice'), this.selectedBloodlines);
        this.refreshSelection('Patrons: ', $('#patronChoice'), this.selectedPatrons);
    },

    resetCheckboxes: function (checkboxClass, list, prefix) {
        $('.' + checkboxClass).prop('checked', false);
        $.each(list, function (index, value) {
            $(`#${prefix}_${value.toId()}`).prop('checked', true);
        });
    },

    refreshSelectedSources: function (source, enabled) {
        this.changeSelection(this.selectedSources, source, enabled, $.proxy(this.spellData.sourceSort, this.spellData));
        if (this.selectedSources.length > 0) {
            $('#sourceNames').text('Source books: ' + this.selectedSources.join(', '));
        } else {
            $('#sourceNames').text('Source books: none selected');
        }
        // Only show options that exist in the given sources, or that are already on
        this.showOptionsForSourceSelection(this.spellData.classesForSources, 'class', this.selectedClasses);
        this.showOptionsForSourceSelection(this.spellData.domainsForSources, 'domain', this.selectedDomains);
        this.showOptionsForSourceSelection(this.spellData.bloodlinesForSources, 'bloodline', this.selectedBloodlines);
        this.showOptionsForSourceSelection(this.spellData.patronsForSources, 'patron', this.selectedPatrons);
    },

    showOptionsForSourceSelection: function (sourceMap, prefix, current) {
        var values = this.spellData.valuesFromSourceMap(sourceMap, this.selectedSources);
        $(`.${prefix}Label`).hide();
        $.each(values.concat(current), function (index, value) {
            $(`#${prefix}_${value.toId()}`).parent().show();
        });
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

    refreshSelection: function (label, element, list) {
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
        this.storage.set(BookKeys.keySelectedDomains, this.selectedDomains);
        this.storage.set(BookKeys.keySelectedBloodlines, this.selectedBloodlines);
        this.storage.set(BookKeys.keySelectedPatrons, this.selectedPatrons);
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
