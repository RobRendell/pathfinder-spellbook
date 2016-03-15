
String.prototype.toId = function() {
    return this.replace(/[^a-zA-Z0-9]/g, '_');
}

String.prototype.toTitleCase = function () {
    return this.replace(/\w\S*/g, function (match) {
        return match.charAt(0).toUpperCase() + match.substr(1).toLowerCase();
    });
}

Number.prototype.ordinal = function (n) {
    n = (n !== undefined) ? n : this;
    var suffix = ["th","st","nd","rd"];
    var value = n%100;
    return n + (suffix[(value-20)%10] || suffix[value] || suffix[0]);
}

$.fn.presence = function () {
    return this.length !== 0 && this;
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
        this.spellByName = {};
        this.buildResultMapsForSources([
            [ this.classesForSources, $.proxy(this.getClassLevelsFromSpell, this) ],
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
        this.spellByName = {};
        this.buildResultMapsForSources([
            [ thisclassesForSources, $.proxy(this.getClassLevelsFromSpell, this) ],
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

    getClassLevelsFromSpell: function (spell, map) {
        if (!map) {
            map = {}
        }
        $.each(this.classHeadings, function (index, classHeading) {
            if (spell[classHeading] === 'NULL' || spell[classHeading] === undefined) {
                spell[classHeading] = undefined;
            } else {
                var value = parseInt(spell[classHeading]);
                if (!map[classHeading] || value > map[classHeading]) {
                    map[classHeading] = value;
                }
            }
        });
        return map;
    },

    getDomainsFromSpell: function (spell, map) {
        return this.getLevelsFromSpellField(spell, 'domain', map);
    },

    getBloodlinesFromSpell: function (spell, map) {
        return this.getLevelsFromSpellField(spell, 'bloodline', map);
    },

    getPatronsFromSpell: function (spell, map) {
        return this.getLevelsFromSpellField(spell, 'patron', map);
    },

    getLevelsFromSpellField: function (spell, fieldName, map) {
        if (!map) {
            map = {};
        }
        if (spell[fieldName]) {
            if ($.type(spell[fieldName]) == 'string') {
                var parsed = {};
                $.each(spell[fieldName].split(/, */), function (index, value) {
                    var keyValueArray = value.match(/([^()]*?) \(([0-9]*)\)/);
                    if (keyValueArray) {
                        var value = parseInt(keyValueArray[2]);
                        parsed[keyValueArray[1]] = value;
                        spell[`${fieldName.toTitleCase()}: ${keyValueArray[1]}`] = value;
                    } else {
                        console.error(`Field ${fieldName} of spell ${spell.name} did not match expected pattern: ${value}`);
                    }
                });
                spell[fieldName] = parsed;
            }
            $.each(spell[fieldName], function (key, value) {
                if (!map[key] || value > map[key]) {
                    map[key] = value;
                }
            });
        }
        return map;
    },

    buildResultMapsForSources: function (resultMapsAndFnList) {
        $.each(this.rawData, $.proxy(function (index, spell) {
            this.spellByName[spell.name.toLowerCase()] = spell;
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
        }, this));
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
    keySelectedBloodlines: 'selectedBloodlines',
    keySelectedDomains: 'selectedDomains',
    keySelectedPatrons: 'selectedPatrons',
    keySelectedSchool: 'selectedSchool',
    keySlotType: 'slotType_',
    keySlots: 'slots_',
    keySlotsToday: 'slotsToday_',
    keyKnown: 'known_'
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
        $('#spellPopup').dialog({
            'width': 'auto',
            'autoOpen': false,
            'modal': true
        });
        $('body').on('tap', '.ui-widget-overlay', function (evt) {
            $('#spellPopup').dialog('close');
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
        var button = $('<div class="book" />');
        button.append($('<img src="newBook.png" />'));
        button.append($('<div />').text('New spellbook'));
        button.on('tap', $.proxy(this.newSpellbookClicked, this));
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
        var button = $('<div class="book" />');
        button.attr('id', id);
        button.append($('<img src="book.png" />'));
        button.append($(`<div class="name_${id}"></div>`).text(text));
        button.on('tap', $.proxy(this.spellbookClicked, this));
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
        $('.panel').fadeOut();
        $('#bookMenu').fadeIn();
        // Load data
        this.selectedSources = this.storage.getArray(BookKeys.keySelectedSources);
        this.selectedClasses = this.storage.getArray(BookKeys.keySelectedClasses);
        this.selectedDomains = this.storage.getArray(BookKeys.keySelectedDomains);
        this.selectedBloodlines = this.storage.getArray(BookKeys.keySelectedBloodlines);
        this.selectedPatrons = this.storage.getArray(BookKeys.keySelectedPatrons);
        this.selectedSchool = this.storage.getArray(BookKeys.keySelectedSchool);
        this.classSlots = this.loadSpellsPerDay(this.selectedClasses, '');
        this.bloodlineSlots = this.loadSpellsPerDay(this.selectedBloodlines, 'Bloodline: ');
        this.domainSlots = this.loadSpellsPerDay(this.selectedDomains, 'Domain: ');
        this.patronSlots = this.loadSpellsPerDay(this.selectedPatrons, 'Patron: ');
        this.schoolSlots = this.loadSpellsPerDay(this.selectedSchool, 'School: ');
        this.knownSpells = {};
        this.loadSpellsKnown(this.selectedClasses, '');
        this.loadSpellsKnown(this.selectedBloodlines, 'Bloodline: ');
        this.loadSpellsKnown(this.selectedDomains, 'Domain: ');
        this.loadSpellsKnown(this.selectedPatrons, 'Patron: ');

        // Set up elements
        $('#bookPanelTitle').removeClass();
        $('#bookPanelTitle').addClass(`name_${this.id}`).text(this.storage.get(BookKeys.keyBookName));
        $('.back').on('tap', $.proxy(this.back, this));
        $('#detailsButton').on('tap', $.proxy(this.showDetailsPanel, this));
        $('#perDayButton').on('tap', $.proxy(this.showPerDayPanel, this));
        $('#knownButton').on('tap', $.proxy(this.showKnownPanel, this));
        $('#adventuringButton').on('tap', $.proxy(this.showAdventuringPanel, this));
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
            this.refreshSelection('Domain: ', $('#domainChoice'), this.selectedDomains);
        }, this));
        $('.bloodline').on('change', $.proxy(function (evt) {
            var checkbox = $(evt.target);
            this.changeSelection(this.selectedBloodlines, checkbox.attr('name'), checkbox.prop('checked'));
            this.refreshSelection('Bloodline: ', $('#bloodlineChoice'), this.selectedBloodlines);
        }, this));
        $('.patron').on('change', $.proxy(function (evt) {
            var checkbox = $(evt.target);
            this.changeSelection(this.selectedPatrons, checkbox.attr('name'), checkbox.prop('checked'));
            this.refreshSelection('Patron: ', $('#patronChoice'), this.selectedPatrons);
        }, this));
        $('.school').on('change', $.proxy(function (evt) {
            var checkbox = $(evt.target);
            this.changeSelection(this.selectedSchool, checkbox.attr('name'), checkbox.prop('checked'));
            this.refreshSelection('School: ', $('#schoolChoice'), this.selectedSchool);
        }, this));
        $('#detailsPanelApply').on('tap', $.proxy(this.onDetailsPanelApply, this));
        $('#detailsPanelDelete').on('tap', $.proxy(this.onDetailsPanelDelete, this));
        $('#spellsPerDayPanelApply').on('tap', $.proxy(this.onSpellsPerDayPanelApply, this));
        $('#spellsKnownPanelApply').on('tap', $.proxy(this.onSpellsKnownPanelApply, this));
        $('#adventuringRestButton').on('tap', $.proxy(this.onAdventuringRestButton, this));
    },

    loadSpellsPerDay: function (list, prefix) {
        var result = {};
        $.each(list, $.proxy(function (index, value) {
            var maxLevel = 9; // TODO
            var heading = prefix + value;
            var slotType = this.storage.get(BookKeys.keySlotType + heading.toId());
            var toIntBase10 = function (value) {
                return parseInt(value);
            };
            var slots = this.storage.getArray(BookKeys.keySlots + heading.toId()).map(toIntBase10);
            var slotsToday = this.storage.getArray(BookKeys.keySlotsToday + heading.toId()).map(toIntBase10);
            result[heading] = { 'slotType': slotType, 'slots': slots, 'slotsToday': slotsToday };
        }, this));
        return result;
    },

    loadSpellsKnown: function (list, prefix) {
        $.each(list, $.proxy(function (index, value) {
            value = prefix + value;
            var spells = this.storage.getArray(BookKeys.keyKnown + value.toId());
            this.knownSpells[value] = spells;
        }, this));
    },

    back: function () {
        $('.panel').fadeOut();
        if (this.currentView == 'menu') {
            $('.ui-accordion').accordion('destroy');
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
        this.resetDetailsCheckboxes();
    },

    resetDetailsCheckboxes: function () {
        this.resetCheckboxes('sourcebook', this.selectedSources, 'source');
        this.resetCheckboxes('characterclass', this.selectedClasses, 'class');
        this.resetCheckboxes('domain', this.selectedDomains, 'domain');
        this.resetCheckboxes('bloodline', this.selectedBloodlines, 'bloodline');
        this.resetCheckboxes('patron', this.selectedPatrons, 'patron');
        this.resetCheckboxes('school', this.selectedSchool, 'school');
        this.refreshSelectedSources();
        this.refreshSelectedClasses();
        this.refreshSelection('Bloodline: ', $('#bloodlineChoice'), this.selectedBloodlines);
        this.refreshSelection('Domain: ', $('#domainChoice'), this.selectedDomains);
        this.refreshSelection('Patron: ', $('#patronChoice'), this.selectedPatrons);
        this.refreshSelection('School: ', $('#schoolChoice'), this.selectedSchool);
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
        this.showOptionsForSourceSelection(this.spellData.bloodlinesForSources, 'bloodline', this.selectedBloodlines);
        this.showOptionsForSourceSelection(this.spellData.domainsForSources, 'domain', this.selectedDomains);
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
        var selectedClassNames = this.selectedClasses.map($.proxy(function (key) {
            return this.spellData.classNames[key];
        }, this));
        this.refreshSelection('Character classes: ', $('#classNames'), selectedClassNames);
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
        this.storage.set(BookKeys.keySelectedBloodlines, this.selectedBloodlines);
        this.storage.set(BookKeys.keySelectedDomains, this.selectedDomains);
        this.storage.set(BookKeys.keySelectedPatrons, this.selectedPatrons);
        this.storage.set(BookKeys.keySelectedSchool, this.selectedSchool);
        this.back();
    },

    onDetailsPanelDelete: function (evt) {
        var name = this.storage.get(BookKeys.keyBookName);
        if (window.confirm('Do you really want to delete "' + name + '"?  All saved configuration will be lost.')) {
            this.topMenu.deleteBook(this.id);
            this.currentView = 'menu';
            this.back();
        }
    },

    showPerDayPanel: function () {
        $('.panel').fadeOut();
        $('#spellsPerDayPanel').fadeIn();
        this.currentView = 'spellsPerDayPanel';
        $('#spellsPerDayItems').html('');
        this.addClassSpellsPerDay();
    },

    textPreparedSlots: 'Prepared spell slots',
    textSpontaneousSlots: 'Spontaneous spell slots',
    textNotSlots: 'Not spell slots',

    addClassSpellsPerDay: function () {
        this.appendCategory(this.selectedClasses, '', this.classSlots, $.proxy(this.defaultSlotForClass, this));
        this.appendCategory(this.selectedBloodlines, 'Bloodline: ', this.bloodlineSlots, this.textNotSlots);
        this.appendCategory(this.selectedDomains, 'Domain: ', this.domainSlots, this.textPreparedSlots);
        this.appendCategory(this.selectedPatrons, 'Patron: ', this.patronSlots, this.textNotSlots);
        this.appendCategory(this.selectedSchool, 'School: ', this.schoolSlots, this.textPreparedSlots);
    },

    defaultSlotForClass: function (classHeading) {
        // I don't believe this can be made data-driven from the stuff available from pathfindercommunity.net :(
        if (classHeading == 'bard' || classHeading == 'bloodrager' || classHeading == 'inquisitor' ||
                classHeading == 'oracle' || classHeading == 'skald' || classHeading == 'sor' ||
                classHeading == 'summoner') {
            return this.textSpontaneousSlots;
        } else {
            return this.textPreparedSlots;
        }
    },

    appendCategory: function (list, prefix, previousValues, defaultValue) {
        $.each(list, $.proxy(function (index, value) {
            var maxLevel = 9; // TODO
            if ($.isFunction(defaultValue)) {
                this.appendSpellsPerDay(prefix, value, maxLevel, previousValues, defaultValue(value));
            } else {
                this.appendSpellsPerDay(prefix, value, maxLevel, previousValues, defaultValue);
            }
        }, this));
    },

    appendSpellsPerDay: function (prefix, value, maxLevel, previousValues, defaultValue) {
        value = prefix + value;
        var name = (prefix) ? value : this.spellData.classNames[value];
        var slotData = previousValues[value] || { 'slots': [] };
        var topDiv = $('<div/>').addClass('spellsPerDay');
        var title = $('<div/>');
        title.append($('<b/>').text(name + ' spells per day'));
        var control = $(`<select class="spellsPerDaySlotType" id="${value.toId()}_slotType" />`);
        control.append($('<option/>').text(this.textPreparedSlots));
        control.append($('<option/>').text(this.textSpontaneousSlots));
        control.append($('<option/>').text(this.textNotSlots));
        title.append(control);
        var tableId = value.toId() + '_slots';
        control.on('change', $.proxy(function (evt) {
            if (control.val() == this.textNotSlots) {
                $('#' + tableId).hide();
            } else {
                $('#' + tableId).show();
            }
        }, this));
        control.val(slotData.slotType || defaultValue);
        topDiv.append(title);
        var table = $('<table />').attr('id', tableId);
        var row = $('<tr />');
        for (var level = 0; level <= maxLevel; ++level) {
            row.append($('<td />').text(Number.prototype.ordinal(level) + " level"));
        }
        table.append(row);
        row = $('<tr />');
        for (var level = 0; level <= maxLevel; ++level) {
            var data = $('<td />');
            var inputElement = $(`<input type="number" step="1" class="spellPerDay_${value.toId()}" />`);
            data.append(inputElement);
            inputElement.val(slotData.slots[level] || 0);
            row.append(data);
        }
        table.append(row);
        topDiv.append(table);
        $('#spellsPerDayItems').append(topDiv);
        control.trigger('change');
    },

    onSpellsPerDayPanelApply: function () {
        this.classSlots = this.saveSpellsPerDay(this.selectedClasses, '');
        this.bloodlineSlots = this.saveSpellsPerDay(this.selectedBloodlines, 'Bloodline: ');
        this.domainSlots = this.saveSpellsPerDay(this.selectedDomains, 'Domain: ');
        this.patronSlots = this.saveSpellsPerDay(this.selectedPatrons, 'Patron: ');
        this.schoolSlots = this.saveSpellsPerDay(this.selectedSchool, 'School: ');
        this.back();
    },

    saveSpellsPerDay: function (list, prefix) {
        var result = {};
        $.each(list, $.proxy(function (index, value) {
            var maxLevel = 9; // TODO
            value = prefix + value;
            var slotType = $(`#${value.toId()}_slotType`).val();
            var slots = [];
            $(`.spellPerDay_${value.toId()}`).each(function (index, input) {
                slots.push(parseInt($(input).val()));
            });
            this.storage.set(BookKeys.keySlotType + value.toId(), slotType);
            this.storage.set(BookKeys.keySlots + value.toId(), slots);
            result[value] = { 'slotType': slotType, 'slots': slots };
        }, this));
        return result;
    },

    showKnownPanel: function () {
        $('.panel').fadeOut();
        $('#spellsKnownPanel').fadeIn();
        this.currentView = 'spellsKnownPanel';
        $('#spellsKnownPanel .ui-accordion').accordion('destroy');
        $('#spellListAccordion').html('');
        this.listSpellCategory(this.selectedClasses, '');
        this.listSpellCategory(this.selectedBloodlines, 'Bloodline: ');
        this.listSpellCategory(this.selectedDomains, 'Domain: ');
        this.listSpellCategory(this.selectedPatrons, 'Patron: ');
        $('#spellsKnownPanel .accordion').accordion({
            collapsible: true,
            heightStyle: "content"
        });
    },

    listSpellCategory: function (list, prefix) {
        var accordion = $('#spellListAccordion');
        $.each(list, $.proxy(function (index, value) {
            value = prefix + value;
            var name = (prefix) ? value : this.spellData.classNames[value];
            accordion.append($('<h3/>').text(name));
            var categoryDiv = $('<div/>').addClass('accordion').addClass(value.toId());
            this.spellData.rawData.sort(this.orderSpellsByFields(value, 'name'));
            var lastLevel, currentDiv;
            $.each(this.spellData.rawData, $.proxy(function (index, spell) {
                if (spell[value] !== undefined && this.selectedSources.indexOf(spell.source) >= 0) {
                    if (spell[value] != lastLevel) {
                        lastLevel = spell[value];
                        categoryDiv.append($('<h4 />').text('Level ' + lastLevel));
                        currentDiv = $('<div />');
                        categoryDiv.append(currentDiv);
                    }
                    this.appendSpellLine(currentDiv, spell, this.knownSpells[value]);
                }
            }, this));
            accordion.append(categoryDiv);
        }, this));
    },

    appendSpellLine: function (element, spell, known) {
        var line = $('<label class="spell" />');
        line.addClass(spell.school);
        line.append($('<span />').addClass('title').text(spell.name));
        line.append($('<span/>').addClass('view').html('&#x1f441;').on('tap', $.proxy(function (evt) {
            this.displaySpellDetails(spell);
            evt.preventDefault();
        }, this)));
        if (known) {
            var spellNameLower = spell.name.toLowerCase();
            if (known.indexOf(spellNameLower) >= 0) {
                line.append($(`<input type="checkbox" name="${spellNameLower}" checked="checked"/>`));
            } else {
                line.append($(`<input type="checkbox" name="${spellNameLower}" />`));
            }
        }
        element.append(line);
        return line;
    },

    orderSpellsByFields: function () {
        var fields = arguments;
        return function (o1, o2) {
            for (var index = 0; index < fields.length; ++index) {
                var v1 = o1[fields[index]];
                var v2 = o2[fields[index]];
                if (v1 !== undefined || v2 !== undefined) {
                    if (v1 === undefined || v1 < v2) {
                        return -1;
                    } else if (v2 === undefined || v1 > v2) {
                        return 1;
                    }
                }
            }
            return 0;
        };
    },

    displaySpellDetails: function (spell) {
        var content = spell.full_text;
        content = content.replace(/<i>([^<,.]*)([,.])?<\/i>/g, $.proxy(function (whole, spellName, after) {
            if (this.spellData.spellByName[spellName.toLowerCase()]) {
                after = after || '';
                return '<i><a href="#">' + spellName + '</a>' + after + '</i>';
            } else {
                return whole;
            }
        }, this));
        if (this.selectedSources.indexOf('Mythic Adventures') < 0) {
            var mythicMatch = /<h[1-5]><b>Mythic:/.exec(content);
            if (mythicMatch) {
                content = content.substr(0, mythicMatch.index);
            }
        }
        $('#spellPopup').html(content).dialog('option', 'title', spell.name).dialog('open');
        $('#spellPopup a').on('tap', $.proxy(this.spellHyperlink, this));
    },

    spellHyperlink: function (evt) {
        evt.preventDefault();
        var spellName = $(evt.target).text().toLowerCase();
        this.displaySpellDetails(this.spellData.spellByName[spellName]);
    },

    onSpellsKnownPanelApply: function () {
        this.saveSpellsKnown(this.selectedClasses, '');
        this.saveSpellsKnown(this.selectedBloodlines, 'Bloodline: ');
        this.saveSpellsKnown(this.selectedDomains, 'Domain: ');
        this.saveSpellsKnown(this.selectedPatrons, 'Patron: ');
        this.back();
    },

    saveSpellsKnown: function (list, prefix) {
        $.each(list, $.proxy(function (index, value) {
            value = prefix + value;
            var spells = [];
            $(`.${value.toId()} :checked`).each(function (index, input) {
                spells.push($(input).attr('name'));
            });
            this.storage.set(BookKeys.keyKnown + value.toId(), spells);
            this.knownSpells[value] = spells;
        }, this));
    },

    showAdventuringPanel: function () {
        $('.panel').fadeOut();
        $('#adventuringPanel').fadeIn();
        this.currentView = 'adventuringPanel';
        $('#adventuringSpells').off('.adventureControl');
        $('#adventuringSpells').html('');
        this.addAdventuringCategory(this.selectedClasses, '', this.classSlots);
        this.addAdventuringCategory(this.selectedBloodlines, 'Bloodline: ', this.bloodlineSlots);
        this.addAdventuringCategory(this.selectedDomains, 'Domain: ', this.domainSlots);
        this.addAdventuringCategory(this.selectedPatron, 'Patron: ', this.patronSlots);
        this.addAdventuringCategory(this.selectedSchool, 'School: ', this.schoolSlots);
    },

    addAdventuringCategory: function (list, prefix, categorySlotData) {
        var topDiv = $('#adventuringSpells');
        if (!list) {
            return;
        }
        $.each(list, $.proxy(function (index, value) {
            value = prefix + value;
            var name = (prefix) ? value : this.spellData.classNames[value];
            var slotData = categorySlotData[value] || { 'slots': [] };
            if (!slotData.slotsToday) {
                slotData.slotsToday = [];
            }
            topDiv.append($('<h4/>').text(name));
            if (slotData.slotType != this.textNotSlots) {
                var table = $('<table class="slotTable" />');
                topDiv.append(table);
                var row1 = $('<tr/>');
                var row2 = $('<tr/>');
                $.each(slotData.slots, $.proxy(function (index, spellsPerDay) {
                    if (slotData.slotsToday.length - 1 < index) {
                        slotData.slotsToday.push(spellsPerDay);
                    }
                    if (spellsPerDay > 0) {
                        row1.append($('<th/>').text(index.ordinal() + ' level'));
                        var td = $('<td/>');
                        row2.append(td);
                        if (slotData.slotType == this.textSpontaneousSlots) {
                            this.createCheckboxControl(td, spellsPerDay, slotData.slotsToday, index, value);
                        } else {
                            td.text(spellsPerDay);
                        }
                    }
                }, this));
                table.append(row1);
                table.append(row2);
                this.spellData.rawData.sort(this.orderSpellsByFields(value, 'name'));
                var spellsToday = this.knownSpells[value];
                if (slotData.slotType == this.textPreparedSlots) {
                    spellsToday = []; // TODO this.preparedSpells[value];
                }
                var lastLevel, currentDiv, tapFn, pressFn;
                $.each(this.spellData.rawData, $.proxy(function (index, spell) {
                    if (spell[value] !== undefined && spellsToday.indexOf(spell.name.toLowerCase()) >= 0) {
                        if (spell[value] != lastLevel) {
                            lastLevel = spell[value];
                            topDiv.append($('<h4 />').text('Level ' + lastLevel));
                            currentDiv = $('<div />');
                            topDiv.append(currentDiv);
                            if (slotData.slotType == this.textSpontaneousSlots) {
                                var checkboxElementId = `slot_${value.toId()}_${lastLevel}`;
                                tapFn = $.proxy(function (evt) {
                                    this.checkboxInteraction($('#' + checkboxElementId), -1);
                                }, this);
                                pressFn = $.proxy(function (evt) {
                                    this.checkboxInteraction($('#' + checkboxElementId), 1);
                                }, this);
                                currentDiv.addClass(checkboxElementId);
                                if (slotData.slots[lastLevel] > 0 && slotData.slotsToday[lastLevel] == 0) {
                                    currentDiv.fadeTo(0, 0.3);
                                }
                            }
                        }
                        var element = this.appendSpellLine(currentDiv, spell);
                        element.on('tap.adventureControl', tapFn);
                        element.on('press.adventureControl', pressFn);
                    }
                }, this));
            }
        }, this));
    },

    createCheckboxControl: function (element, spellsPerDay, slotsToday, slotKey, heading) {
        element.prop('id', `slot_${heading.toId()}_${slotKey}`);
        element.addClass('checkboxControl');
        element.data('psb.spellsPerDay', spellsPerDay);
        element.data('psb.slotsToday', slotsToday);
        element.data('psb.slotKey', slotKey);
        element.data('psb.heading', heading);
        this.refreshCheckboxesNOfM(element, spellsPerDay, slotsToday[slotKey]);
        element.on('tap.adventureControl', $.proxy(this.checkboxTouchHandler, this));
        element.on('press.adventureControl', $.proxy(this.checkboxTouchHandler, this));
    },

    checkboxTouchHandler: function (evt) {
        var delta = (!evt) ? 0 : (evt.type === 'tap') ? -1 : 1;
        this.checkboxInteraction($(evt.target), delta);
    },

    checkboxInteraction: function (element, delta) {
        if (element.presence()) {
            var spellsPerDay = element.data('psb.spellsPerDay');
            var slotsToday = element.data('psb.slotsToday');
            var slotKey = element.data('psb.slotKey');
            var heading = element.data('psb.heading');
            if (slotsToday[slotKey] + delta <= spellsPerDay && slotsToday[slotKey] + delta >= 0) {
                slotsToday[slotKey] += delta;
                this.refreshCheckboxesNOfM(element, spellsPerDay, slotsToday[slotKey]);
                this.storage.set(BookKeys.keySlotsToday + heading.toId(), slotsToday);
                if (slotsToday[slotKey] == 0 && delta == -1) {
                    $('.' + element.prop('id')).fadeTo('fast', 0.3);
                } else if (slotsToday[slotKey] == 1 && delta == 1) {
                    $('.' + element.prop('id')).fadeTo('fast', 1.0);
                }
            }
        }
    },

    refreshCheckboxesNOfM: function (element, max, current) {
        var checkboxes = '';
        for (box = 0; box < max; ++box) {
            if (box > 0) {
                checkboxes += '&nbsp;';
            }
            if (box >= max - current) {
                checkboxes += '&#9744;';
            } else {
                checkboxes += '&#9745;';
            }
        }
        element.html(checkboxes);
    },

    onAdventuringRestButton: function (evt) {
        this.categoryRest(this.selectedClasses, '', this.classSlots);
        $('.checkboxControl').each($.proxy(function (index, element) {
            this.checkboxInteraction($(element), 0);
        }, this));
    },

    categoryRest: function (list, prefix, categorySlotData) {
        if (!list) {
            return;
        }
        $.each(list, $.proxy(function (index, value) {
            value = prefix + value;
            var slotData = categorySlotData[value];
            if (slotData.slotType == this.textSpontaneousSlots) {
                for (var level = 0; level < slotData.slots.length; ++level) {
                    if (slotData.slotsToday[level] == 0) {
                        $(`.slot_${value.toId()}_${level}`).fadeTo('fast', 1.0);
                    }
                    slotData.slotsToday[level] = slotData.slots[level];
                }
                this.storage.set(BookKeys.keySlotsToday + value.toId(), slotData.slotsToday);
            }
        }, this));
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
