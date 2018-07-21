
String.prototype.toId = function() {
    return this.toLowerCase().replace(/[^a-z0-9]/g, '_');
};

String.prototype.toTitleCase = function () {
    return this.replace(/\w\S*/g, function (match) {
        return match.charAt(0).toUpperCase() + match.substr(1).toLowerCase();
    });
};

if (!String.prototype.trim) {
    String.prototype.trim = function () {
        return this.replace(/^\s+|\s+$/g, '');
    };
}

Number.prototype.ordinal = function () {
    const suffix = ["th","st","nd","rd"];
    const value = this % 100;
    return this + (suffix[(value-20)%10] || suffix[value] || suffix[0]);
};

Array.prototype.uniq = function () {
    const result = [];
    for (let index = 0; index < this.length; ++index) {
        if (index === 0 || this[index] !== this[index - 1]) {
            result.push(this[index]);
        }
    }
    return result;
};

$.fn.presence = function () {
    return this.length !== 0 && this;
};

$.fn.setVisible = function (visible) {
    if (visible) {
        this.show();
    } else {
        this.hide();
    }
};

class Storage {

    constructor(name, basePrefix) {
        this.basePrefix = basePrefix || 'pathfinder.spellbook.';
        this.name = name || '';
        this.prefix = this.basePrefix + this.name + '.';
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
    }

    supportsLocalStorage() {
        return ('localStorage' in window && window['localStorage'] !== null);
    }

    setDefault(name, value) {
        if (this.get(name) === undefined) {
            this.set(name, value);
        }
    }

    set(name, value) {
        this.data[this.prefix + name] = JSON.stringify(value);
    }

    get(name, defaultValue) {
        const value = this.data[this.prefix + name];
        if (value === undefined) {
            return defaultValue;
        } else {
            return JSON.parse(value);
        }
    }

    clear(name) {
        const value = this.data[this.prefix + name];
        if (this.isLocalStorage)
            this.data.removeItem(this.prefix + name);
        else
            delete(this.data[this.prefix + name]);
        return value;
    }

    clearAll() {
        const keys = this.getKeys();
        $.each(keys, (index, key) => {
            this.clear(key);
        });
    }

    getKeys() {
        if (this.isLocalStorage)
        {
            const result = [];
            for (let index = 0; index < this.data.length; ++index)
            {
                let key = this.data.key(index);
                if (key.indexOf(this.prefix) === 0)
                {
                    key = key.substring(this.prefix.length);
                    result.push(key);
                }
            }
            return result;
        }
        else
            return Object.keys(this.data);
    }

}

class SpellData {

    constructor(headings, rawData, progressFn) {
        this.fixedHeadings = [ 'name', 'school', 'subschool', 'descriptor',
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
            'patron', 'mythic_text', 'augmented', 'mythic' ];
        this.schools = [ 'Abjuration', 'Conjuration', 'Divination', 'Enchantment', 'Evocation', 'Illusion',
            'Necromancy', 'Transmutation' ];
        this.rawData = rawData;
        this.classNames = { 'wiz': 'Wizard', 'sor': 'Sorcerer'};
        headings.forEach((value) => {
            if (this.fixedHeadings.indexOf(value) < 0) {
                if (!this.classNames[value]) {
                    this.classNames[value] = value.toTitleCase();
                }
            }
        });
        this.classHeadings = Object.keys(this.classNames).sort();
        // Lots of later books add Core and APG spells to their new classes, bloodlines and domains.
//        this.classesForSources = {
//            'PFRPG Core': [ 'adept', 'bard', 'cleric', 'druid', 'paladin', 'ranger', 'sor', 'wiz' ],
//            'APG': [ 'alchemist', 'inquisitor', 'oracle', 'summoner', 'witch' ]
//        };
//        this.bloodlinesForSources = {
//            'PFRPG Core': [ 'Aberrant', 'Abyssal', 'Arcane', 'Celestial', 'Destined', 'Draconic', 'Elemental', 'Fey',
//                'Infernal', 'Undead' ],
//            'APG': [ 'Aquatic', 'Boreal', 'Deepearth', 'Dreamspun', 'Protean', 'Serpentine', 'Shadow', 'Starsoul',
//                'Stormborn', 'Verdant' ]
//        };
//        this.domainsForSources = {
//            'PFRPG Core': [ 'Air', 'Animal', 'Artifice', 'Chaos', 'Charm', 'Community', 'Darkness', 'Death',
//                'Destruction', 'Earth', 'Evil', 'Fire', 'Glory', 'Good', 'Healing', 'Knowledge', 'Law', 'Liberation',
//                'Luck', 'Madness', 'Magic', 'Nobility', 'Plant', 'Protection', 'Repose', 'Rune', 'Strength', 'Sun',
//                'Travel', 'Trickery', 'War', 'Water', 'Weather' ],
//            'APG': [ 'Agathion', 'Ancestors', 'Arcane', 'Archon', 'Ash', 'Azata', 'Blood', 'Catastrophe', 'Caves',
//                'Cloud', 'Construct', 'Curse', 'Daemon', 'Day', 'Decay', 'Deception', 'Defense', 'Demon', 'Devil',
//                'Divine', 'Exploration', 'Family', 'Fate', 'Feather', 'Ferocity', 'Freedom', 'Fur', 'Growth',
//                'Heroism', 'Home', 'Honor', 'Ice', 'Inevitable', 'Insanity', 'Language', 'Leadership', 'Light',
//                'Loss', 'Love', 'Lust', 'Martyr', 'Memory', 'Metal', 'Murder', 'Night', 'Nightmare', 'Oceans',
//                'Protean', 'Purity', 'Rage', 'Resolve', 'Restoration', 'Resurrection', 'Revolution', 'Seasons',
//                'Smoke', 'Souls', 'Storms', 'Tactics', 'Thievery', 'Thought', 'Toil', 'Trade', 'Undead', 'Wards',
//                'Wind' ]
//        };
//        this.patronsForSources = {
//            'PFRPG Core': [],
//            'APG': [ 'Agility', 'Animals', 'Deception', 'Elements', 'Endurance', 'Plague', 'Shadow', 'Strength',
//                'Transformation', 'Trickery', 'Water', 'Wisdom' ]
//        };
        // TODO
        this.classesForSources = {};
        this.domainsForSources = {};
        this.bloodlinesForSources = {};
        this.patronsForSources = {};
        this.spellById = {};
        this.domainCoverage = {};
        this.buildResultMapsForSources(progressFn, [
            [ this.classesForSources, this.getClassLevelsFromSpell.bind(this) ],
            [ this.domainsForSources, this.getDomainsFromSpell.bind(this) ],
            [ this.bloodlinesForSources, this.getBloodlinesFromSpell.bind(this) ],
            [ this.patronsForSources, this.getPatronsFromSpell.bind(this) ]
        ]);
        this.sources = Object.keys(this.classesForSources).sort(this.sourceSort.bind(this));
        this.domains = this.valuesFromSourceMap(this.domainsForSources).sort();
        this.bloodlines = this.valuesFromSourceMap(this.bloodlinesForSources).sort();
        this.patrons = this.valuesFromSourceMap(this.patronsForSources).sort();
        this.subdomains = {};
        $.each(this.domainCoverage, (domain, coverage) => {
            this.subdomains[domain] = (Object.keys(coverage).length < 9);
        });
        // Sanity check
//        const thisclassesForSources = {};
//        const thisdomainsForSources = {};
//        const thisbloodlinesForSources = {};
//        const thispatronsForSources = {};
//        this.spellById = {};
//        this.buildResultMapsForSources(progressFn, [
//            [ thisclassesForSources, this.getClassLevelsFromSpell.bind(this) ],
//            [ thisdomainsForSources, this.getDomainsFromSpell.bind(this) ],
//            [ thisbloodlinesForSources, this.getBloodlinesFromSpell.bind(this) ],
//            [ thispatronsForSources, this.getPatronsFromSpell.bind(this) ]
//        ]);
//        const domains = this.valuesFromSourceMap(thisdomainsForSources).sort();
//        const bloodlines = this.valuesFromSourceMap(thisbloodlinesForSources).sort();
//        const patrons = this.valuesFromSourceMap(thispatronsForSources).sort();
//        console.log(`domains: actual ${domains.length} vs correct core/apg ${this.domains.length}`);
//        console.log(`bloodlines: actual ${bloodlines.length} vs correct core/apg ${this.bloodlines.length}`);
//        console.log(`patrons: actual ${patrons.length} vs correct core/apg ${this.patrons.length}`);
    }

    getClassLevelsFromSpell(spell, map) {
        if (!map) {
            map = {};
        }
        $.each(this.classHeadings, function (index, classHeading) {
            if (spell[classHeading] === 'NULL' || spell[classHeading] === undefined) {
                spell[classHeading] = undefined;
            } else {
                spell[classHeading] = parseInt(spell[classHeading]);
                const value = spell[classHeading];
                if (!map[classHeading] || value > map[classHeading]) {
                    map[classHeading] = value;
                }
            }
        });
        return map;
    }

    getDomainsFromSpell(spell, map) {
        return this.getLevelsFromSpellField(spell, 'domain', map, (spell, domain, level) => {
            if (!this.domainCoverage[domain]) {
                this.domainCoverage[domain] = {};
            }
            this.domainCoverage[domain][level] = true;
        });
    }

    getBloodlinesFromSpell(spell, map) {
        return this.getLevelsFromSpellField(spell, 'bloodline', map);
    }

    getPatronsFromSpell(spell, map) {
        return this.getLevelsFromSpellField(spell, 'patron', map);
    }

    getLevelsFromSpellField(spell, fieldName, map, extraFn) {
        if (!map) {
            map = {};
        }
        if (spell[fieldName]) {
            if ($.type(spell[fieldName]) === 'string') {
                const parsed = {};
                $.each(spell[fieldName].split(/, */), function (index, value) {
                    const keyValueArray = value.match(/([^()]*?) \(([0-9]*)\)/);
                    if (keyValueArray) {
                        const name = keyValueArray[1];
                        const numberValue = parseInt(keyValueArray[2]);
                        parsed[name] = numberValue;
                        spell[`${fieldName.toTitleCase()}: ${name}`] = numberValue;
                        if (extraFn) {
                            extraFn(spell,name, numberValue);
                        }
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
    }

    buildResultMapsForSources(progressFn, resultMapsAndFnList) {
        $.each(this.rawData, (index, spell) => {
            this.spellById[spell.name.toId()] = spell;
            $.each(resultMapsAndFnList, function (index, resultMapAndFn) {
                const resultMap = resultMapAndFn[0];
                const resultFn = resultMapAndFn[1];
                if (!resultMap[spell.source]) {
                    resultMap[spell.source] = {}
                }
                if (!$.isArray(resultMap[spell.source])) {
                    resultFn(spell, resultMap[spell.source]);
                }
            });
            if (progressFn) {
                progressFn(index);
            }
        });
        $.each(resultMapsAndFnList, function (index, resultMapAndFn) {
            const resultMap = resultMapAndFn[0];
            $.each(resultMap, function (source, value) {
                if (!$.isArray(value)) {
                    resultMap[source] = Object.keys(value);
                }
            });
        });
    }

    sourceSort(o1, o2) {
        o1 = this.sourceMunge(o1);
        o2 = this.sourceMunge(o2);
        if (o1 < o2) {
            return -1;
        } else if (o1 > o2) {
            return 1;
        } else {
            return 0;
        }
    }

    sourceMunge(sourceName) {
        if (sourceName === 'PFRPG Core') {
            return 'AAAA ';
        } else if (sourceName === 'APG') {
            return 'AAAB ';
        } else if (sourceName.startsWith('Ultimate ')) {
            return 'AAAC ' + sourceName;
        } else if (sourceName.startsWith('Advanced ')) {
            return 'AAAD ' + sourceName;
        } else {
            return sourceName;
        }
    }

    valuesFromSourceMap(sourceMap, sourceList) {
        const result = {};
        if (!sourceList) {
            sourceList = Object.keys(sourceMap);
        }
        $.each(sourceList, (index, source) => {
            $.each(sourceMap[source], function (index, value) {
                result[value] = 1;
            });
        });
        return Object.keys(result);
    }

}

const BookKeys = {
    keyBookIDs: 'bookIDs',
    keyBookName: 'bookName',
    keyCurrentBookID: 'currentBookID',
    keyPanelHistory: 'panelHistory',
    keySelectedSources: 'selectedSources',
    keySelectedClasses: 'selectedClasses',
    keySelectedBloodlines: 'selectedBloodlines',
    keySelectedDomains: 'selectedDomains',
    keySelectedPatrons: 'selectedPatrons',
    keySelectedSchools: 'selectedSchools',
    keyCategoryAssociations: 'categoryAssociations',
    keyClassSlots: 'classSlots',
    keyKnownSpells: 'knownSpells',
    keyPreparedSpells: 'preparedSpells',
    keySavedSpellListNames: 'savedSpellListNames',
    keySavedSpellLists: 'savedSpellLists'
};

class TopMenu {

    constructor(globalSettings, spellData) {
        this.defaultBookName = 'My Spellbook';
        this.globalSettings = globalSettings;
        this.spellData = spellData;
        this.bookData = {};
        this.bookMenu = {};
        this.bookIDs = globalSettings.get(BookKeys.keyBookIDs, []);
        $.each(this.bookIDs, (index, bookID) => {
            this.bookData[bookID] = new Storage(bookID);
        });
        // Create new elements in sub-menus
        $.each(this.spellData.sources, function (index, source) {
            const sourceLine = $(`<label><input type="checkbox" id="source_${source.toId()}" name="${source}" class="sourcebook"> ${source}</label>`);
            $('#sourceItems').append(sourceLine);
        });
        this.addOptionsToSelect(this.spellData.classHeadings, 'class', function (heading) {
            return spellData.classNames[heading];
        });
        this.addOptionsToSelect(this.spellData.domains, 'domain', function (domain) {
            return (spellData.subdomains[domain]) ? domain + ' (subdomain)' : domain;
        });
        this.addOptionsToSelect(this.spellData.bloodlines, 'bloodline');
        this.addOptionsToSelect(this.spellData.patrons, 'patron');
        const schoolOptions = [ '', 'favoured', 'opposed' ];
        $.each(this.spellData.schools, function (index, school) {
            const schoolElt = $('<div class="school"/>').attr('id', `school_${school.toId()}`).text(school + ' ');
            $('#schoolItems').append(schoolElt);
            const select = $('<select />').prop('name', school);
            $.each(schoolOptions, function (index, value) {
                select.append($('<option/>', { 'value': value }).text(value));
            });
            schoolElt.append(select);
        });
        $('#spellPopup').dialog({
            'width': 'auto',
            'autoOpen': false,
            'closeOnEscape': false,
            'modal': true,
            'close': () => {
                this.selectedBook.removeSpellsFromHistory();
            }
        });
        $('body').on('tap', '.ui-widget-overlay', (evt) => {
            $('#spellPopup').dialog('close');
            evt.preventDefault();
            evt.stopPropagation();
        });
        $(document).on('keydown', (evt) => {
            if (evt.keyCode === 27 && this.selectedBook) {
                evt.preventDefault();
                this.selectedBook.back();
            }
        });
        $(window).on('hashchange', () => {
            if (this.selectedBook) {
                this.selectedBook.openPanel(window.location.hash.substr(1));
            }
        });
        this.setSelectedBook(this.globalSettings.get(BookKeys.keyCurrentBookID));
    }

    addNewBookButton() {
        const button = $('<div/>').addClass('book newbook');
        button.append($('<img src="newBook.png" />'));
        button.append($('<div />').text('New spellbook'));
        button.on('tap', this.newSpellbookClicked.bind(this));
        $('#spellbooks').append(button);
        this.newBookButton = button;
    }

    newSpellbookClicked() {
        const id = this.getNewBookID();
        const storage = new Storage(id);
        this.bookData[id] = storage;
        this.bookIDs.push(id);
        this.globalSettings.set(BookKeys.keyBookIDs, this.bookIDs);
        storage.set(BookKeys.keyBookName, this.defaultBookName);
        this.addBookButton(id, storage);
    }

    getNewBookID() {
        let id;
        do {
            id = 'book' + Math.random().toFixed(8).substr(2);
        } while (this.bookData[id]);
        return id;
    }

    addBookButton(id, storage) {
        const text = storage.get(BookKeys.keyBookName);
        const button = $('<div class="book" />');
        button.attr('id', id);
        button.append($('<img src="book.png" />'));
        button.append($(`<div class="name_${id}"></div>`).text(text));
        button.on('tap', this.spellbookClicked.bind(this));
        this.newBookButton.before(button);
    }

    spellbookClicked(evt) {
        const target = evt.currentTarget;
        const id = $(target).attr('id');
        this.setSelectedBook(id);
    }

    setSelectedBook(bookID) {
        if (bookID) {
            this.globalSettings.set(BookKeys.keyCurrentBookID, bookID);
            if (!this.bookMenu[bookID]) {
                this.bookMenu[bookID] = new BookMenu(bookID, this.bookData[bookID], this.spellData, this.globalSettings, this);
            }
            this.selectedBook = this.bookMenu[bookID];
            this.selectedBook.showBookMenu();
        } else {
            this.globalSettings.clear(BookKeys.keyCurrentBookID);
            this.globalSettings.clear(BookKeys.keyPanelHistory);
            this.selectedBook = null;
            $('.panel').fadeOut();
            this.refresh();
        }
    }

    refresh() {
        $('#spellbooks.ui-sortable').sortable('destroy');
        const topdiv = $('#spellbooks');
        topdiv.off();
        topdiv.html('');
        this.addNewBookButton();
        $.each(this.bookIDs, (index, id) => {
            const storage = this.bookData[id];
            this.addBookButton(id, storage);
        });
        topdiv.sortable({
            items: '.book:not(.newbook)',
            stop: () => {
                const ids = $('.book:not(.newbook)').map(function () { return $(this).attr('id') } ).get();
                this.bookIDs = ids;
                this.globalSettings.set(BookKeys.keyBookIDs, ids);
            }
        });
        topdiv.disableSelection();
        topdiv.fadeIn();
    }

    deleteBook(id) {
        const index = this.bookIDs.indexOf(id);
        if (index >= 0) {
            this.bookData[id].clearAll();
            delete(this.bookData[id]);
            this.bookIDs.splice(index, 1);
            this.globalSettings.set(BookKeys.keyBookIDs, this.bookIDs);
        }
    }

    addOptionsToSelect(valueList, prefix, displayFn) {
        $.each(valueList, function (index, value) {
            const displayName = (displayFn) ? displayFn(value) : value;
            const line = $(`<label class="${prefix}Label"><input type="checkbox" id="${prefix}_${value.toId()}" name="${value}" class="${prefix}"> ${displayName}</label>`);
            $(`#${prefix}Items`).append(line);
        });
    }

}

class BookMenu {
    constructor(id, storage, spellData, globalSettings, topMenu) {
        this.textPreparedSlots = 'Prepared spell slots';
        this.textSpontaneousSlots = 'Spontaneous spell slots';
        this.id = id;
        this.storage = storage;
        this.spellData = spellData;
        this.globalSettings = globalSettings;
        this.topMenu = topMenu;
    }

    showBookMenu() {
        // Load data
        this.selectedSources = this.storage.get(BookKeys.keySelectedSources, []);
        this.selectedClasses = this.storage.get(BookKeys.keySelectedClasses, []);
        this.selectedDomains = this.storage.get(BookKeys.keySelectedDomains, []);
        this.selectedBloodlines = this.storage.get(BookKeys.keySelectedBloodlines, []);
        this.selectedPatrons = this.storage.get(BookKeys.keySelectedPatrons, []);
        this.selectedSchools = this.storage.get(BookKeys.keySelectedSchools, {});
        this.categoryAssociations = this.storage.get(BookKeys.keyCategoryAssociations, {});
        this.classSlots = this.storage.get(BookKeys.keyClassSlots, {});
        this.knownSpells = this.storage.get(BookKeys.keyKnownSpells, {});
        this.preparedSpells = this.storage.get(BookKeys.keyPreparedSpells, {});
        this.savedSpellLists = this.storage.get(BookKeys.keySavedSpellLists, {});
        this.savedSpellListNames = this.storage.get(BookKeys.keySavedSpellListNames, Object.keys(this.savedSpellLists));
        // Set up elements
        const $bookPanelTitle = $('#bookPanelTitle');
        $bookPanelTitle.removeClass();
        $bookPanelTitle.addClass(`name_${this.id}`).text(this.storage.get(BookKeys.keyBookName));
        $('.back').on('tap', this.back.bind(this));
        $('#detailsButton').on('tap', () => {this.openPanel('detailsPanel')});
        $('#spellSlotsButton').on('tap', () => {this.openPanel('spellSlotsPanel')});
        $('#knownButton').on('tap', () => {this.openPanel('spellsKnownPanel')});
        $('#adventuringButton').on('tap', () => {this.openPanel('adventuringPanel')});
        // Details panel setup
        $('#detailsAccordion').accordion({
            collapsible: true,
            active: false,
            heightStyle: "content"
        });
        $('#detailsPanel .clear').on('click touch', this.clearAllCheckboxes.bind(this));
        $('#detailsPanel .clearOptions').on('click touch', this.clearAllOptions.bind(this));
        $('#detailsPanel .select').on('click touch', this.setAllCheckboxes.bind(this));
        $('.sourcebook').on('change', (evt) => {
            const checkbox = $(evt.target);
            this.refreshSelectedSources(checkbox.attr('name'), checkbox.prop('checked'));
        });
        $('.class').on('change', (evt) => {
            const checkbox = $(evt.target);
            this.refreshSelectedClasses(checkbox.attr('name'), checkbox.prop('checked'));
        });
        $('.domain').on('change', (evt) => {
            const checkbox = $(evt.target);
            this.changeSelection(this.copy.selectedDomains, checkbox.attr('name'), checkbox.prop('checked'), this.domainCompare.bind(this));
            this.refreshSelectedDomains();
        });
        $('.bloodline').on('change', (evt) => {
            const checkbox = $(evt.target);
            this.changeSelection(this.copy.selectedBloodlines, checkbox.attr('name'), checkbox.prop('checked'));
            this.refreshSelection('Bloodline: ', $('#bloodlineChoice'), this.copy.selectedBloodlines);
        });
        $('.patron').on('change', (evt) => {
            const checkbox = $(evt.target);
            this.changeSelection(this.copy.selectedPatrons, checkbox.attr('name'), checkbox.prop('checked'));
            this.refreshSelection('Patron: ', $('#patronChoice'), this.copy.selectedPatrons);
        });
        $('.school').on('change', (evt) => {
            const select = $(evt.target);
            if (select.val()) {
                this.copy.selectedSchools[select.prop('name')] = select.val();
            } else {
                delete(this.copy.selectedSchools[select.prop('name')]);
            }
            this.refreshSelection('School: ', $('#schoolChoice'), this.copy.selectedSchools);
        });
        $('#detailsPanelApply').on('tap', this.onDetailsPanelApply.bind(this));
        $('#detailsPanelDelete').on('tap', this.onDetailsPanelDelete.bind(this));
        $('#spellSlotsPanelApply').on('tap', this.onSpellSlotsPanelApply.bind(this));
        $('#spellsKnownPanelApply').on('tap', this.onSpellsKnownPanelApply.bind(this));
        $('#adventuringRestButton').on('tap', this.onAdventuringRestButton.bind(this));
        $('#adventuringChangeSpellsButton').on('tap', () => {this.openPanel('prepareSpellsPanel')});
        $('#prepareSpellsApplyButton').on('tap', this.onPrepareSpellsApplyButton.bind(this));
        $('#prepareSpellsStoreButton').on('tap', () => {this.openPanel('spellStorePanel')});
        $('#spellStoreSaveButton').on('tap', this.onSpellStoreSaveButton.bind(this));
        $('#spellStoreLoadButton').on('tap', this.onSpellStoreLoadButton.bind(this));
        $('#spellStoreDeleteButton').on('tap', this.onSpellStoreDeleteButton.bind(this));
        // Load saved panel history
        this.panelHistory = [];
        const views = this.globalSettings.get(BookKeys.keyPanelHistory, [ 'menu' ]);
        for (let index = 0; index < views.length; ++index) {
            this.openPanel(views[index]);
        }
    }

    openPanel(view) {
        if (this.panelHistory.length === 0 || view !== this.panelHistory[this.panelHistory.length - 1]) {
            const backwards = this.panelHistory.indexOf(view);
            if (backwards >= 0) {
                this.panelHistory.splice(backwards + 1);
            } else {
                this.panelHistory.push(view);
            }
            this.globalSettings.set(BookKeys.keyPanelHistory, this.panelHistory);
            window.location.hash = view;
            if (view.startsWith('spell:')) {
                const spellId = view.substr('spell:'.length);
                const spell = this.spellData.spellById[spellId];
                this.displaySpellDetails(spell);
            } else if ($('#spellPopup').dialog('isOpen')) {
                $('#spellPopup').dialog('close');
            } else {
                $('.panel').fadeOut();
                if (view === '') {
                    $('.ui-accordion').accordion('destroy');
                    $('#book *').off();
                    this.topMenu.setSelectedBook(null);
                } else if (view === 'menu') {
                    $('#bookMenu').fadeIn();
                } else if (view === 'detailsPanel') {
                    $('#detailsPanel').fadeIn();
                    this.showDetailsPanel();
                } else if (view === 'spellSlotsPanel') {
                    $('#spellSlotsPanel').fadeIn();
                    this.showSpellSlotsPanel();
                } else if (view === 'spellsKnownPanel') {
                    $('#spellsKnownPanel').fadeIn();
                    this.showKnownPanel();
                } else if (view === 'adventuringPanel') {
                    $('#adventuringPanel').fadeIn();
                    this.showAdventuringPanel();
                } else if (view === 'prepareSpellsPanel') {
                    $('#prepareSpellsPanel').fadeIn();
                    this.showPrepareSpellsPanel();
                } else if (view === 'spellStorePanel') {
                    $('#spellStorePanel').fadeIn();
                    this.showSpellStorePanel();
                } else {
                    console.error('Unknown view name: ' + view);
                }
            }
        }
    }

    back() {
        if (this.panelHistory.length > 1) {
            this.openPanel(this.panelHistory[this.panelHistory.length - 2]);
        } else {
            this.openPanel('');
        }
    }

    removeSpellsFromHistory() {
        while (this.panelHistory.length > 0 && this.panelHistory[this.panelHistory.length - 1].startsWith('spell:')) {
            this.panelHistory.pop();
        }
        this.globalSettings.set(BookKeys.keyPanelHistory, this.panelHistory);
    }

    showDetailsPanel() {
        $('#spellbookNameInput').val(this.storage.get(BookKeys.keyBookName));
        this.copy = $.extend(true, {}, {
            selectedSources: this.selectedSources,
            selectedClasses: this.selectedClasses,
            selectedBloodlines: this.selectedBloodlines,
            selectedPatrons: this.selectedPatrons,
            selectedSchools: this.selectedSchools
        });
        if (this.selectedDomains.length > 0) {
            this.copy.selectedDomains = this.selectedDomains.toString().split(/,/).sort(this.domainCompare.bind(this));
        } else {
            this.copy.selectedDomains = [];
        }
        this.resetCheckboxes('sourcebook', this.copy.selectedSources, 'source');
        this.resetCheckboxes('class', this.copy.selectedClasses, 'class');
        this.resetCheckboxes('domain', this.copy.selectedDomains, 'domain');
        this.resetCheckboxes('bloodline', this.copy.selectedBloodlines, 'bloodline');
        this.resetCheckboxes('patron', this.copy.selectedPatrons, 'patron');
        $.each(this.spellData.schools, (index, school) => {
            $('select[name="' + school + '"]').val(this.copy.selectedSchools[school]);
        });
        this.refreshSelectedSources();
        this.refreshSelectedClasses();
        this.refreshSelection('Bloodline: ', $('#bloodlineChoice'), this.copy.selectedBloodlines);
        this.refreshSelectedDomains();
        this.refreshSelection('Patron: ', $('#patronChoice'), this.copy.selectedPatrons);
        this.refreshSelection('School: ', $('#schoolChoice'), this.copy.selectedSchools);
    }

    resetCheckboxes(checkboxClass, list, prefix) {
        $('.' + checkboxClass).prop('checked', false);
        $.each(list, function (index, value) {
            $(`#${prefix}_${value.toId()}`).prop('checked', true);
        });
    }

    refreshSelectedSources(source, enabled) {
        this.changeSelection(this.copy.selectedSources, source, enabled, this.spellData.sourceSort.bind(this.spellData));
        if (this.copy.selectedSources.length > 0) {
            $('#sourceNames').text('Source books: ' + this.copy.selectedSources.join(', '));
        } else {
            $('#sourceNames').text('Source books: none selected');
        }
        // Only show options that exist in the given sources, or that are already on
        this.showOptionsForSourceSelection(this.spellData.classesForSources, 'class', this.copy.selectedClasses);
        this.showOptionsForSourceSelection(this.spellData.bloodlinesForSources, 'bloodline', this.copy.selectedBloodlines);
        this.showOptionsForSourceSelection(this.spellData.domainsForSources, 'domain', this.copy.selectedDomains);
        this.showOptionsForSourceSelection(this.spellData.patronsForSources, 'patron', this.copy.selectedPatrons);
    }

    showOptionsForSourceSelection(sourceMap, prefix, current) {
        const values = this.spellData.valuesFromSourceMap(sourceMap, this.copy.selectedSources);
        $(`.${prefix}Label`).hide();
        $.each(values.concat(current), function (index, value) {
            $(`#${prefix}_${value.toId()}`).parent().show();
        });
    }

    refreshSelectedClasses(classHeading, enabled) {
        this.changeSelection(this.copy.selectedClasses, classHeading, enabled, undefined);
        const selectedClassNames = this.copy.selectedClasses.map((key) => {
            return this.spellData.classNames[key];
        });
        this.refreshSelection('Character classes: ', $('#classNames'), selectedClassNames);
    }

    changeSelection(list, value, enabled, sortFn) {
        if (value) {
            const index = $.inArray(value, list);
            if (enabled && index < 0) {
                list.push(value);
                list.sort(sortFn);
            } else if (!enabled && index >= 0) {
                list.splice(index, 1);
            }
        }
    }

    refreshSelection(label, element, values) {
        if ($.isArray(values)) {
            if (values.length > 0) {
                element.text(label + values.join(', '));
            } else {
                element.text(label + 'none selected');
            }
        } else if (Object.keys(values).length === 0) {
            element.text(label + 'none selected');
        } else {
            let reverse = {};
            $.each(values, function (key, value) {
                if (!reverse[value]) {
                    reverse[value] = [];
                }
                reverse[value].push(key);
            });
            let text = '';
            $.each(Object.keys(reverse).sort(), function (index, key) {
                if (text) {
                    text += ', ';
                }
                text += key + ': ';
                text += reverse[key].sort().join(', ');
            });
            element.text(label + text);
        }
    }

    domainCompare(d1, d2) {
        const v1 = (this.spellData.subdomains[d1]) ? 1 : 0;
        const v2 = (this.spellData.subdomains[d2]) ? 1 : 0;
        return v2 - v1;
    }

    bunchDomains(flatList) {
        const result = [];
        let domainStart = flatList.findIndex((domain) => {
            return !this.spellData.subdomains[domain];
        });
        if (domainStart < 0) {
            domainStart = flatList.length;
        }
        let domainIndex = domainStart;
        for (let index = 0; index < domainStart; ++index) {
            const subdomain = flatList[index];
            const domain = (domainIndex < flatList.length) ? flatList[domainIndex++] : null;
            result.push([domain, subdomain]);
        }
        for (let index = domainIndex; index < flatList.length; ++index) {
            result.push(flatList[index]);
        }
        return result;
    }

    domainsToString(bunched) {
        let string = '';
        for (let index = 0; index < bunched.length; ++index) {
            const domain = bunched[index];
            if (string) {
                string += ', ';
            }
            if ($.isArray(domain)) {
                string += domain[1];
                string += ' (subdomain of ';
                string += domain[0] || '?';
                string += ')';
            } else {
                string += domain;
            }
        }
        return string;
    }

    refreshSelectedDomains() {
        if (this.copy.selectedDomains.length > 0) {
            const bunched = this.bunchDomains(this.copy.selectedDomains);
            $('#domainChoice').text('Domains: ' + this.domainsToString(bunched));
        } else {
            $('#domainChoice').text('Domains: none selected');
        }
    }

    onDetailsPanelApply() {
        const newName = $('#spellbookNameInput').val();
        this.storage.set(BookKeys.keyBookName, newName);
        $(`.name_${this.id}`).text(newName);
        this.selectedSources = this.copy.selectedSources;
        this.selectedClasses = this.copy.selectedClasses;
        this.selectedBloodlines = this.copy.selectedBloodlines;
        this.selectedDomains = this.bunchDomains(this.copy.selectedDomains);
        this.selectedPatrons = this.copy.selectedPatrons;
        this.selectedSchools = this.copy.selectedSchools;
        this.copy = null;
        this.storage.set(BookKeys.keySelectedSources, this.selectedSources);
        this.storage.set(BookKeys.keySelectedClasses, this.selectedClasses);
        this.storage.set(BookKeys.keySelectedBloodlines, this.selectedBloodlines);
        this.storage.set(BookKeys.keySelectedDomains, this.selectedDomains);
        this.storage.set(BookKeys.keySelectedPatrons, this.selectedPatrons);
        this.storage.set(BookKeys.keySelectedSchools, this.selectedSchools);
        this.back();
    }

    onDetailsPanelDelete() {
        const name = this.storage.get(BookKeys.keyBookName);
        if (window.confirm('Do you really want to delete "' + name + '"?  All saved configuration will be lost.')) {
            this.topMenu.deleteBook(this.id);
            this.openPanel('menu');
            this.back();
        }
    }

    showLoading(element, endFn) {
        element.html('');
        const spinner = $('<img class="spinner" src="loading.gif" />');
        element.after(spinner);
        window.setTimeout(function () {
            endFn();
            $('.spinner').remove();
        }, 500);
    }

    showSpellSlotsPanel() {
        this.showLoading($('#spellSlotsItems'), this.populateSpellSlotsPanel.bind(this));
    }

    populateSpellSlotsPanel() {
        this.appendClassSlots();
        if (this.selectedClasses.length > 1) {
            this.appendClassAssociation('Bloodline', this.selectedBloodlines);
            this.appendClassAssociation('Domain', this.selectedDomains);
            this.appendClassAssociation('Patron', this.selectedPatrons);
            this.appendClassAssociation('School', this.selectedSchools);
        }
    }

    appendClassAssociation(heading, list) {
        const assocation = this.categoryAssociations[heading] || {};
        $.each(list, (index, category) => {
            let text = heading + ' ';
            if ($.isArray(category)) {
                category = category[1];
            } else if (isNaN(index)) {
                text = category.toTitleCase() + ' ' + text;
                category = index;
            }
            const div = $('<div/>').addClass('spellSlotsHeading');
            div.append($('<b/>').text(text + category + ' associated with '));
            const select = $('<select/>').prop('name', heading + '_' + category.toId());
            $.each(this.selectedClasses, (index, classHeading) => {
                const className = this.spellData.classNames[classHeading];
                select.append($('<option/>', {value: classHeading}).text(className));
            });
            div.append(select);
            select.val(assocation[category] || this.selectedClasses[0]);
            $('#spellSlotsItems').append(div);
        });
    }

    defaultSlotForClass(classHeading) {
        // I don't believe this can be made data-driven from the stuff available from pathfindercommunity.net :(
        if (classHeading === 'bard' || classHeading === 'bloodrager' || classHeading === 'inquisitor' ||
                classHeading === 'oracle' || classHeading === 'skald' || classHeading === 'sor' ||
                classHeading === 'summoner') {
            return this.textSpontaneousSlots;
        } else {
            return this.textPreparedSlots;
        }
    }

    appendClassSlots() {
        $.each(this.selectedClasses, (index, value) => {
            const maxLevel = 9; // TODO
            this.appendSpellSlots('', value, maxLevel, this.classSlots, this.defaultSlotForClass(value));
        });
    }

    appendSpellSlots(prefix, value, maxLevel, previousValues, defaultValue) {
        value = prefix + value;
        const name = (prefix) ? value : this.spellData.classNames[value];
        const slotData = previousValues[value] || { 'slots': [] };
        const topDiv = $('<div/>').addClass('spellSlots');
        const title = $('<div/>').addClass('spellSlotsHeading');
        title.append($('<b/>').text(name + ' spells per day'));
        const control = $(`<select id="${value.toId()}_slotType" />`);
        control.append($('<option/>').text(this.textPreparedSlots));
        control.append($('<option/>').text(this.textSpontaneousSlots));
        title.append(control);
        const slotDivId = value.toId() + '_slots';
        control.val(slotData.slotType || defaultValue);
        topDiv.append(title);
        const slotsDiv = $('<div />').addClass('allSlots').attr('id', slotDivId);
        for (let level = 0; level <= maxLevel; ++level) {
            const slot = $('<div/>').addClass('spellsPerDaySlot');
            slot.append($('<div/>').text(level.ordinal() + ' level'));
            const inputElement = $(`<input type="number" step="1" class="spellPerDay_${value.toId()}" />`);
            slot.append($('<div/>').append(inputElement));
            inputElement.val(slotData.slots[level] || 0);
            slotsDiv.append(slot);
        }
        topDiv.append(slotsDiv);
        $('#spellSlotsItems').append(topDiv);
        control.trigger('change');
    }

    onSpellSlotsPanelApply() {
        this.classSlots = this.buildSpellSlots();
        this.storage.set(BookKeys.keyClassSlots, this.classSlots);
        this.categoryAssociations = {};
        this.saveAssocations('Bloodline', this.selectedBloodlines);
        this.saveAssocations('Domain', this.selectedDomains);
        this.saveAssocations('Patron', this.selectedPatrons);
        this.saveAssocations('School', this.selectedSchools);
        this.storage.set(BookKeys.keyCategoryAssociations, this.categoryAssociations);
        this.back();
    }

    buildSpellSlots() {
        const result = {};
        $.each(this.selectedClasses, (index, value) => {
            const slotType = $(`#${value.toId()}_slotType`).val();
            const slots = [];
            $(`.spellPerDay_${value.toId()}`).each(function (index, input) {
                slots.push(parseInt($(input).val()));
            });
            result[value] = { 'slotType': slotType, 'slots': slots };
        });
        return result;
    }

    saveAssocations(heading, list) {
        $.each(list, (index, category) => {
            if (!this.categoryAssociations[heading]) {
                this.categoryAssociations[heading] = {};
            }
            if ($.isArray(category)) {
                category = category[1];
            } else if (isNaN(index)) {
                category = index;
            }
            let value;
            if (this.selectedClasses.length === 1) {
                value = this.selectedClasses[0];
            } else {
                value = $(`select[name="${heading}_${category.toId()}"]`).val();
            }
            this.categoryAssociations[heading][category] = value;
        });
    }

    showKnownPanel() {
        $('#spellsKnownPanel .ui-accordion').accordion('destroy');
        this.showLoading($('#spellListAccordion'), this.populateKnownPanel.bind(this));
    }

    populateKnownPanel() {
        this.listSpellCategory(this.selectedClasses, '');
        this.listSpellCategory(this.selectedBloodlines, 'Bloodline: ');
        this.listSpellCategory(this.selectedDomains, 'Domain: ');
        this.listSpellCategory(this.selectedPatrons, 'Patron: ');
        $('#spellsKnownPanel .accordion').accordion({
            collapsible: true,
            heightStyle: "content"
        });
    }

    listSpellCategory(list, prefix) {
        const accordion = $('#spellListAccordion');
        $.each(list, (index, value) => {
            let name;
            let subdomain = null;
            if ($.isArray(value)) {
                subdomain = [ value[0], value[1], prefix ];
                name = prefix + this.domainsToString([ value ]);
                value = prefix + value[1];
            } else {
                value = prefix + value;
                name = (prefix) ? value : this.spellData.classNames[value];
            }
            if (!this.knownSpells[value]) {
                this.knownSpells[value] = {};
            }
            const headingElt = $('<h3/>').text(name);
            accordion.append(headingElt);
            headingElt.append($('<span/>').addClass('headingControlLink').text('Clear All').on('click touch', this.clearAllCheckboxes.bind(this)));
            headingElt.append($('<span/>').addClass('headingControlLink').text('Select All').on('click touch', this.setAllCheckboxes.bind(this)));
            const categoryDiv = $('<div/>').addClass('accordion').addClass(value.toId());
            this.spellData.rawData.sort(this.orderSpellsByFields(subdomain || value, 'name'));
            let currentLevel = -1, currentDiv, skipDomainSpell = false;
            for (let index = 0; index < this.spellData.rawData.length; ++index) {
                const spell = this.spellData.rawData[index];
                let spellLevel = spell[value];
                if (this.selectedSources.indexOf(spell.source) >= 0 || (this.knownSpells[value][spellLevel] || []).indexOf(spell.name.toId()) >= 0) {
                    if (subdomain) {
                        if (skipDomainSpell) {
                            spellLevel = undefined;
                            skipDomainSpell = false;
                        } else if (spellLevel === undefined) {
                            spellLevel = spell[prefix + subdomain[0]];
                        } else {
                            // Subdomain spells are sorted just before the domain spell they override.
                            skipDomainSpell = true;
                        }
                    }
                    if (spellLevel !== undefined) {
                        if (spellLevel !== currentLevel) {
                            currentLevel = spellLevel;
                            const levelElt = $('<h4 />').text('Level ' + currentLevel);
                            levelElt.append($('<span class="headingControlLink" />').text('Clear All').on('click touch', this.clearAllCheckboxes.bind(this)));
                            levelElt.append($('<span class="headingControlLink" />').text('Select All').on('click touch', this.setAllCheckboxes.bind(this)));
                            levelElt.append($('<span/>').addClass('headingNote').text('(0 known)'));
                            categoryDiv.append(levelElt);
                            currentDiv = $('<div />').addClass('spellLevelDiv');
                            categoryDiv.append(currentDiv);
                            currentDiv.on('change', 'input', function (evt) {
                                const container = $(evt.target).closest('.spellLevelDiv');
                                const selected = container.find(':checked');
                                container.prev().find('.headingNote').text(`(${selected.length} known)`);
                            });
                        }
                        this.appendSpellLine(currentDiv, spell, (this.knownSpells[value][currentLevel] !== undefined &&
                                this.knownSpells[value][currentLevel].indexOf(spell.name.toId()) >= 0));
                    }
                }
            }
            accordion.append(categoryDiv);
        });
    }

    appendSpellLine(element, spell, known, overLevel) {
        const line = $('<label />').addClass('spell').addClass(spell.school);
        element.append(line);
        line.append($('<span />').addClass('title').text(spell.name));
        if (known !== undefined) {
            const spellKey = spell.name.toId();
            const checkbox = $(`<input type="checkbox" name="${spellKey}" />`).prop('checked', known);
            line.append(checkbox);
            if (known) {
                checkbox.change();
            }
        }
        if (overLevel === 1) {
            line.append($('<span class="note" />').text('(1 level over)'));
        } else if (overLevel > 0) {
            line.append($('<span class="note" />').text('(' + overLevel + ' levels over)'));
        }
        line.append($('<div/>').addClass('view').append($('<img src="eye.svg"/>')).on('tap', (evt) => {
            this.displaySpellDetails(spell);
            evt.stopPropagation();
        }));
        return line;
    }

    setAllCheckboxes(evt) {
        // Find ancestor H3/H4 element, then set all checkboxes in the following sibling.
        const element = $(evt.target).closest('h3,h4').next();
        element.find('input').prop('checked', true).change();
        evt.stopPropagation();
    }

    clearAllCheckboxes(evt) {
        // Find ancestor H3/H4 element, then clear all checkboxes in the following sibling.
        const element = $(evt.target).closest('h3,h4').next();
        element.find('input').prop('checked', false).change();
        evt.stopPropagation();
    }

    clearAllOptions(evt) {
        // Find ancestor H3/H4 element, then clear all select elements in the following sibling.
        const element = $(evt.target).closest('h3,h4').next();
        element.find('select').val('').change();
        evt.stopPropagation();
    }

    orderSpellsByFields() {
        const fields = arguments;
        return function (o1, o2) {
            for (let index = 0; index < fields.length; ++index) {
                const field = fields[index];
                let v1, v2;
                if ($.isArray(field)) {
                    v1 = o1[field[2] + field[0]] || ((o1[field[2] + field[1]] !== undefined) ? o1[field[2] + field[1]] - 0.1 : undefined );
                    v2 = o2[field[2] + field[0]] || ((o2[field[2] + field[1]] !== undefined) ? o2[field[2] + field[1]] - 0.1 : undefined );
                } else {
                    v1 = o1[field];
                    v2 = o2[field];
                }
                if (v1 !== undefined || v2 !== undefined) {
                    if (v2 === undefined || v1 < v2) {
                        return -1;
                    } else if (v1 === undefined || v1 > v2) {
                        return 1;
                    }
                }
            }
            return 0;
        };
    }

    displaySpellDetails(spell) {
        let content = spell.full_text;
        if (this.selectedSources.indexOf('Mythic Adventures') < 0) {
            const mythicMatch = /<h[1-5]><b>Mythic:/.exec(content);
            if (mythicMatch) {
                content = content.substr(0, mythicMatch.index);
            }
        }
        content = content.replace(/<i>([^<,.]*)([,.])?<\/i>/g, (whole, spellName, after) => {
            const spellKey = spellName.toId();
            if (this.spellData.spellById[spellKey]) {
                after = after || '';
                return `<i><a href="#spell:${spellKey}">${spellName}</a>${after}</i>`;
            } else {
                return whole;
            }
        });
        content = content.replace(/<(\/)?h[1-5]>/g, '<$1div>');
        let hasHeadings = false;
        content = content.replace(/<div><b>([A-Z]*)<\/b><\/div>/g, function (whole, subheading) {
            hasHeadings = true;
            return '<div class="subheading">' + subheading.toTitleCase() + '</div>';
        });
        if (!hasHeadings) {
            content = content.replace(/(<div><b>Casting Time)/, '<div class="subheading">Casting</div>$1');
            content = content.replace(/(<div><b>Range)/, '<div class="subheading">Effect</div>$1');
            content = content.replace(/(<div><p>)/, '<div class="subheading">Description</div>$1');
        }
        $('#spellPopup').html(content).dialog('option', 'title', spell.name)
                .dialog('option', 'position', { my: 'left top', at: 'left top', of: window })
                .dialog('open');
        window.location.hash = 'spell:' + spell.name.toId();
    }

    onSpellsKnownPanelApply() {
        this.knownSpells = {};
        this.buildSpellsKnown(this.selectedClasses, '');
        this.buildSpellsKnown(this.selectedBloodlines, 'Bloodline: ');
        this.buildSpellsKnown(this.selectedDomains, 'Domain: ');
        this.setDomainAll();
        this.buildSpellsKnown(this.selectedPatrons, 'Patron: ');
        this.storage.set(BookKeys.keyKnownSpells, this.knownSpells);
        this.back();
    }

    buildSpellsKnown(list, prefix) {
        $.each(list, (index, value) => {
            let category;
            if ($.isArray(value)) {
                category = prefix + value[1];
            } else {
                category = prefix + value;
            }
            const known = {};
            $(`.${category.toId()} :checked`).each((index, input) => {
                const spellKey = $(input).attr('name');
                const spell = this.spellData.spellById[spellKey];
                let level = spell[category];
                if (level === undefined && $.isArray(value)) {
                    level = spell[prefix + value[0]];
                }
                if (!known[level]) {
                    known[level] = [];
                }
                known[level].push(spellKey);
            });
            this.knownSpells[category] = known;
        });
    }

    setDomainAll() {
        $.each(this.selectedDomains, (index, domain) => {
            let all = [], category;
            if ($.isArray(domain)) {
                category = 'Domain: ' + domain[1];
            } else {
                category = 'Domain: ' + domain;
            }
            $.each(this.knownSpells[category], function (level, spellList) {
                all = all.concat(spellList);
            });
            this.knownSpells[category]['all'] = all;
        });
    }

    showAdventuringPanel() {
        const $adventuringSpells = $('#adventuringSpells');
        $adventuringSpells.off('.adventureControl');
        $('#adventuringRestButton').hide();
        $('#adventuringChangeSpellsButton').hide();
        this.showLoading($adventuringSpells, this.populateAdventuringPanel.bind(this));
    }

    populateAdventuringPanel() {
        this.addAdventuringCategory(this.selectedClasses, '', this.classSlots);
    }

    addAdventuringCategory(list, prefix, categorySlotData) {
        const topDiv = $('#adventuringSpells');
        $.each(list, (index, value) => {
            value = prefix + value;
            const name = (prefix) ? value : this.spellData.classNames[value];
            const slotData = categorySlotData[value] || { 'slots': [] };
            if (!slotData.slotsToday) {
                slotData.slotsToday = [];
            }
            topDiv.append($('<h4/>').text(name));
            let spellsToday;
            if (slotData.slotType === this.textPreparedSlots) {
                spellsToday = this.preparedSpells[value] || {};
                $('#adventuringChangeSpellsButton').show();
            } else {
                spellsToday = this.getKnownSpellsForClass(value);
            }
            if (Object.keys(spellsToday).length > 0) {
                $('#adventuringRestButton').show();
            }
            $.each(spellsToday, (level, spellKeyList) => {
                if (slotData.slots[level] === 0 && spellKeyList.length === 0) {
                    return;
                }
                topDiv.append($('<h4 />').text('Level ' + level));
                const currentDiv = $('<div />').data('psb_category', value);
                let clickFn;
                if (slotData.slotType === this.textSpontaneousSlots) {
                    const slotDiv = $('<div class="slotDiv" />');
                    if (slotData.slots[level] > 0) {
                        this.createCheckboxControl(slotDiv, slotData.slots[level], slotData.slotsToday, level, value);
                    } else {
                        slotDiv.text('At will');
                    }
                    topDiv.append(slotDiv);
                    clickFn = (evt) => {
                        this.checkboxInteraction(slotDiv, (evt.type === 'tap') ? -1 : 1);
                    };
                    if (slotData.slots[level] > 0 && slotData.slotsToday[level] === 0) {
                        currentDiv.fadeTo(0, 0.3);
                    }
                } else {
                    clickFn = this.castPreparedSpell.bind(this);
                }
                topDiv.append(currentDiv);
                $.each(spellKeyList.sort(), (index, spellKey) => {
                    let isUsed = false;
                    if (spellKey.indexOf('!') === spellKey.length - 1) {
                        isUsed = true;
                        spellKey = spellKey.substr(0, spellKey.length - 1);
                    }
                    const spell = this.spellData.spellById[spellKey];
                    const spellLevel = this.getSpellLevel(value, spell);
                    const element = this.appendSpellLine(currentDiv, spell, undefined, level - spellLevel);
                    element.data('psb_level', level);
                    element.on('tap.adventureControl press.adventureControl', clickFn);
                    if (isUsed) {
                        element.addClass('used');
                    }
                });
                if (slotData.slotType === this.textPreparedSlots) {
                    const slotUsage = this.calculatePreparedSlotsLeft(value, level);
                    if (slotUsage[0] !== 0) {
                        const text = this.getPreparedSlotsLeftText(slotUsage).replace('remaining', 'unused');
                        currentDiv.append($('<div/>').text(text));
                    }
                }
            });
        });
    }

    getSpellLevel(classHeading, spell) {
        let level = spell[classHeading];
        for (let index = 0; level === undefined && index < this.selectedDomains.length; ++index) {
            const domain = this.selectedDomains[index];
            if ($.isArray(domain)) {
                level = spell['Domain: ' + domain[1]] || spell['Domain: ' + domain[0]];
            } else {
                level = spell['Domain: ' + domain];
            }
        }
        return level;
    }

    createCheckboxControl(element, spellsPerDay, slotsToday, slotKey) {
        element.addClass('checkboxControl');
        element.data('psb_spellsPerDay', spellsPerDay);
        element.data('psb_slotsToday', slotsToday);
        element.data('psb_slotKey', slotKey);
        this.refreshCheckboxesNOfM(element, spellsPerDay, slotsToday[slotKey] || 0);
        element.on('tap.adventureControl', this.checkboxTouchHandler.bind(this));
        element.on('press.adventureControl', this.checkboxTouchHandler.bind(this));
    }

    checkboxTouchHandler(evt) {
        const delta = (!evt) ? 0 : (evt.type === 'tap') ? -1 : 1;
        this.checkboxInteraction($(evt.currentTarget), delta);
    }

    checkboxInteraction(element, delta) {
        if (element.presence()) {
            const spellsPerDay = element.data('psb_spellsPerDay');
            const slotsToday = element.data('psb_slotsToday');
            const slotKey = element.data('psb_slotKey');
            if (slotsToday[slotKey] + delta <= spellsPerDay && slotsToday[slotKey] + delta >= 0) {
                slotsToday[slotKey] += delta;
                this.refreshCheckboxesNOfM(element, spellsPerDay, slotsToday[slotKey]);
                this.storage.set(BookKeys.keyClassSlots, this.classSlots);
                if (slotsToday[slotKey] === 0 && delta === -1) {
                    $('.' + element.attr('id')).fadeTo('fast', 0.3);
                } else if (slotsToday[slotKey] === 1 && delta === 1) {
                    $('.' + element.attr('id')).fadeTo('fast', 1.0);
                }
            }
        }
    }

    refreshCheckboxesNOfM(element, max, current) {
        const checkboxeList = element.find('input[type="checkbox"]');
        if (checkboxeList.length > max) {
            element.html('');
        }
        for (box = 0; box < max; ++box) {
            let checkbox;
            if (box < checkboxeList.length) {
                checkbox = checkboxeList.eq(box);
            } else {
                checkbox = $('<input type="checkbox" />').on('click touch', function (evt) {
                    evt.preventDefault();
                });
                element.append(checkbox);
            }
            checkbox.prop('checked', (box < max - current));
        }
    }

    castPreparedSpell(evt) {
        const spellDiv = $(evt.currentTarget);
        const using = (evt.type === 'tap');
        const spellKey = spellDiv.find('.title').text().toId();
        let from, to;
        if (using) {
            spellDiv.addClass('used');
            from = spellKey;
            to = spellKey + '!';
        } else {
            spellDiv.removeClass('used');
            from = spellKey + '!';
            to = spellKey;
        }
        const level = spellDiv.data('psb_level');
        const category = spellDiv.parent().data('psb_category');
        const prepared = this.preparedSpells[category][level];
        const index = prepared.indexOf(from);
        if (index >= 0) {
            prepared[index] = to;
            this.storage.set(BookKeys.keyPreparedSpells, this.preparedSpells);
        }
    }

    onAdventuringRestButton() {
        this.categoryRest(this.selectedClasses, '', this.classSlots);
        $('.checkboxControl').each((index, element) => {
            this.checkboxInteraction($(element), 0);
        });
        $('.spell.used').removeClass('used');
        this.storage.set(BookKeys.keyClassSlots, this.classSlots);
        this.storage.set(BookKeys.keyPreparedSpells, this.preparedSpells);
    }

    categoryRest(list, prefix, categorySlotData) {
        if (!list) {
            return;
        }
        $.each(list, (index, value) => {
            value = prefix + value;
            const slotData = categorySlotData[value];
            if (slotData.slotType === this.textSpontaneousSlots) {
                for (let level = 0; level < slotData.slots.length; ++level) {
                    if (slotData.slotsToday[level] === 0) {
                        $(`.slot_${value.toId()}_${level}`).fadeTo('fast', 1.0);
                    }
                    slotData.slotsToday[level] = slotData.slots[level];
                }
            } else if (this.preparedSpells[value]) {
                $.each(this.preparedSpells[value], function (level, spellKeyList) {
                    for (let index = 0; index < spellKeyList.length; ++index) {
                        const spellKey = spellKeyList[index];
                        if (spellKey.indexOf('!') === spellKey.length - 1) {
                            spellKeyList[index] = spellKey.substr(0, spellKey.length - 1);
                        }
                    }
                });
            }
        });
    }

    showPrepareSpellsPanel() {
        if (!this.copy || !this.copy.preparedSpells) {
            this.copy = {
                preparedSpells: $.extend(true, {}, this.preparedSpells)
            };
        }
        $('#prepareSpellsPanel').off('.prepareSpells');
        $('#prepareSpellsPanel .ui-accordion').accordion('destroy');
        $('#prepareSpellsPanel .ui-draggable').draggable('destroy');
        $('#prepareSpellsPanel .ui-droppable').droppable('destroy');
        this.showLoading($('#preparedSpells'), this.populatePrepareSpellsPanel.bind(this));
    }

    populatePrepareSpellsPanel() {
        $.each(this.selectedClasses, (index, value) => {
            const slotData = this.classSlots[value];
            if (slotData && slotData.slotType === this.textPreparedSlots) {
                const name = this.spellData.classNames[value];
                const $preparedSpells = $('#preparedSpells');
                $preparedSpells.addClass('accordion').append($('<h3 />').text(name)
                        .append($('<span class="headingControlLink" />').text('Clear').on('click touch', this.clearPreparedSpells.bind(this))));
                const currentDiv = $('<div class="prepareCategory" />').data('category', value);
                $preparedSpells.append(currentDiv);
                const knownDiv = $('<div/>').addClass('accordion').text('Known spells');
                const preparedDiv = $('<div/>').addClass('accordion preparedDiv').text('Prepared spells');
                $(window).on('scroll.prepareSpells', function () {
                    if (!preparedDiv.is(':hidden')) {
                        const max = currentDiv.height() - preparedDiv.innerHeight();
                        const openedLevel = knownDiv.find('.ui-accordion-header-active').data('level') || 0;
                        const preparedHeading = preparedDiv.find('h4').eq(openedLevel);
                        const offset = $(window).scrollTop() - knownDiv.offset().top - preparedHeading.position().top +
                                $('.back').height();
                        if (offset > max) {
                            preparedDiv.css({ 'margin-top': max });
                        } else if (offset > 0) {
                            preparedDiv.css({ 'margin-top': offset });
                        } else {
                            preparedDiv.css({ 'margin-top': 0 });
                        }
                    }
                });
                currentDiv.append(knownDiv);
                currentDiv.append(preparedDiv);
                this.spellData.rawData.sort(this.orderSpellsByFields(value, 'name'));
                if (!this.knownSpells[value]) {
                    this.knownSpells[value] = {};
                }
                if (!this.copy.preparedSpells[value]) {
                    this.copy.preparedSpells[value] = {};
                }
                const maxLevel = 9; // TODO
                let acceptSelector = 'noSuchThing';
                for (let level = 0; level < maxLevel; ++level) {
                    if (!slotData.slots[level]) {
                        continue;
                    }
                    if (!this.knownSpells[value][level]) {
                        this.knownSpells[value][level] = [];
                    }
                    this.appendPreparedKnownSpells(knownDiv, value, level);
                    if (!this.copy.preparedSpells[value][level]) {
                        this.copy.preparedSpells[value][level] = [];
                    }
                    acceptSelector += ',.knownSpells' + level;
                    this.appendPreparedPreparedSpells(preparedDiv, value, level, acceptSelector);
                }
            }
        });
        $('#prepareSpellsPanel .accordion').accordion({
            collapsible: true,
            heightStyle: 'content',
            beforeActivate: function (evt, ui) {
                const target = $(evt.target);
                target.data('changeInProgress', true);
                if (!ui.newHeader || !ui.newHeader.context) {
                    return;
                }
                const children = target.children('h4');
                const active = children.index(ui.newHeader.context);
                // trigger other accordion
                target.parent().find('.accordion').each(function (index, element) {
                    if (!$(element).data('changeInProgress')) {
                        $(element).accordion('option', 'active', active);
                    }
                });
            },
            activate: function (evt) {
                $(evt.target).data('changeInProgress', false);
            }
        });
    }

    getKnownSpellsForClass(classHeading) {
        const maxLevel = 9; // TODO
        const result = {};
        for (let level = 0; level <= maxLevel; ++level) {
            result[level] = this.getKnownSpellsForClassAndLevel(classHeading, level);
        }
        return result;
    }

    getKnownSpellsForClassAndLevel(classHeading, level) {
        let knownSpells = this.knownSpells[classHeading][level] || [];
        knownSpells = this.concatSpellsForLevel(knownSpells, classHeading, this.categoryAssociations.Domain, this.selectedDomains, 'Domain: ', level);
        knownSpells = this.concatSpellsForLevel(knownSpells, classHeading, this.categoryAssociations.Bloodline, this.selectedBloodlines, 'Bloodline: ', level*2 + 1);
        knownSpells = this.concatSpellsForLevel(knownSpells, classHeading, this.categoryAssociations.Patron, this.selectedPatrons, 'Patron: ', level*2);
        return knownSpells;
    }

    concatSpellsForLevel(knownSpells, classHeading, association, list, prefix, level) {
        $.each(list, (index, value) => {
            if ($.isArray(value)) {
                value = value[1];
            }
            if (association && association[value] === classHeading) {
                value = prefix + value;
                if (!this.knownSpells[value]) {
                    this.knownSpells[value] = {};
                }
                if (!this.knownSpells[value][level]) {
                    this.knownSpells[value][level] = [];
                }
                knownSpells = knownSpells.concat(this.knownSpells[value][level]);
            }
        });
        return knownSpells;
    }

    appendPreparedKnownSpells(knownDiv, classHeading, level) {
        const knownSpells = this.getKnownSpellsForClassAndLevel(classHeading, level);
        knownDiv.append($('<h4/>').text(level.ordinal() + ' level').data('level', level));
        const levelDiv = $('<div />').addClass('knownSpellsDiv')
                .droppable({ accept: '.preparedSpell', hoverClass: 'droppableHighlight' })
                .data('psb_category', classHeading);
        knownDiv.append(levelDiv);
        levelDiv.on('drop', this.dropSpell.bind(this));
        $.each(knownSpells.sort().uniq(), (index, spellKey) => {
            const spell = this.spellData.spellById[spellKey];
            this.appendSpellLine(levelDiv, spell).addClass('knownSpells' + level)
                    .addClass(this.getDecorationClassForSpell(classHeading, spell))
                    .draggable({
                        'helper': 'clone',
                        'revert': 'invalid'
                    });
        });
    }

    getDecorationClassForSpell(classHeading, spell) {
        let result = ' ';
        const school = spell.school.toTitleCase();
        if (this.categoryAssociations.School && this.categoryAssociations.School[school] === classHeading) {
            if (this.selectedSchools[school] === 'favoured') {
                result += 'bonus ';
            } else if (this.selectedSchools[school] === 'opposed') {
                result += 'opposed ';
            }
        }
        $.each(this.selectedDomains, (index, domain) => {
            if ($.isArray(domain)) {
                domain = domain[1];
            }
            if (this.categoryAssociations.Domain && this.categoryAssociations.Domain[domain] === classHeading) {
                if (this.knownSpells['Domain: ' + domain]['all'].indexOf(spell.name.toId()) >= 0) {
                    result += 'bonus ';
                }
            }
        });
        return result.substr(0, result.length - 1);
    }

    appendPreparedPreparedSpells(preparedDiv, classHeading, level, acceptSelector) {
        const heading = $('<h4 />').append($('<span/>'))
                .attr('id', `preparedHeading_${classHeading.toId()}_${level}`)
                .droppable({ accept: acceptSelector, hoverClass: 'droppableHighlight' })
                .data('psb_category', classHeading)
                .data('psb_level', level)
                .on('drop', this.dropSpell.bind(this));
        preparedDiv.append(heading);
        const levelDiv = $('<div />').addClass('preparedSpellsDiv')
                .droppable({ accept: acceptSelector, hoverClass: 'droppableHighlight' })
                .data('psb_category', classHeading)
                .data('psb_level', level)
                .on('drop', this.dropSpell.bind(this));
        preparedDiv.append(levelDiv);
        this.updatePreparedHeading(classHeading, level);
        $.each(this.copy.preparedSpells[classHeading][level].sort(), (index, spellKey) => {
            if (spellKey.indexOf('!') === spellKey.length - 1) {
                spellKey = spellKey.substr(0, spellKey.length - 1);
            }
            const spell = this.spellData.spellById[spellKey];
            this.addPreparedSpell(levelDiv, spell, level, classHeading);
        });
    }

    addPreparedSpell(element, spell, level, category) {
        const spellLevel = this.getSpellLevel(category, spell);
        const overLevel = level - spellLevel;
        this.appendSpellLine(element, spell, undefined, overLevel)
                .data('psb_preparedLevel', level)
                .addClass('preparedSpell')
                .addClass(this.getDecorationClassForSpell(category, spell))
                .draggable({
                    'containment': '.prepareCategory.' + category.toId(),
                    'revert': 'invalid'
                });
        this.updatePreparedHeading(category, level);
    }

    clearPreparedSpells(evt) {
        const element = $(evt.target).closest('h3,h4').next();
        element.find('.preparedSpell').remove();
        const category = element.data('category');
        this.copy.preparedSpells[category] = {};
        const maxLevel = 9; // TODO
        for (let level = 0; level <= maxLevel; ++level) {
            this.copy.preparedSpells[category][level] = [];
            this.updatePreparedHeading(category, level);
        }
        evt.stopPropagation();
    }

    calculatePreparedSlotsLeft(classHeading, level) {
        let slots = this.classSlots[classHeading].slots[level];
        const favouredSchool = Object.keys(this.selectedSchools).find((school) => {
             return (this.categoryAssociations.School && this.categoryAssociations.School[school] === classHeading &&
                this.selectedSchools[school] === 'favoured');
        });
        let hasSchoolSlot = level > 0 && favouredSchool;
        let hasDomainSlot = level > 0 && this.selectedDomains.findIndex((domain) => {
            if ($.isArray(domain)) {
                domain = domain[1];
            }
            return (this.categoryAssociations.Domain && this.categoryAssociations.Domain[domain] === classHeading);
        }) >= 0;
        const prepared = ((this.copy && this.copy.preparedSpells) || this.preparedSpells)[classHeading][level];
        $.each(prepared, (index, spellKey) => {
            if (spellKey.indexOf('!') === spellKey.length - 1) {
                spellKey = spellKey.substr(0, spellKey.length - 1);
            }
            const spell = this.spellData.spellById[spellKey];
            const school = spell.school.toTitleCase();
            if (this.categoryAssociations.School && this.categoryAssociations.School[school] === classHeading) {
                const affinity = this.selectedSchools[school];
                if (affinity === 'favoured' && level > 0 && hasSchoolSlot) {
                    hasSchoolSlot = false;
                    return;
                } else if (affinity === 'opposed') {
                    slots -= 2;
                    return;
                }
            }
            if (hasDomainSlot) {
                const domainMatch = $.grep(this.selectedDomains, (domain) => {
                    if ($.isArray(domain)) {
                        domain = domain[1];
                    }
                    if (this.categoryAssociations.Domain[domain] !== classHeading) {
                        return false;
                    }
                    return (this.knownSpells['Domain: ' + domain]['all'].indexOf(spellKey) >= 0)
                });
                if (domainMatch.length > 0) {
                    hasDomainSlot = false;
                    return
                }
            }
            // Otherwise, just use up a regular slot
            slots--;
        });
        let extra = '';
        if (hasSchoolSlot) {
            extra += ' 1 ' + favouredSchool + ' slot';
        }
        if (hasDomainSlot) {
            if (extra) {
                extra += ' and';
            }
            extra += ' 1 domain slot';
        }
        return [slots, extra];
    }

    updatePreparedHeading(category, level) {
        const preparedHeading = $(`#preparedHeading_${category.toId()}_${level}`);
        const slotUsage = this.calculatePreparedSlotsLeft(category, level);
        const text = level.ordinal() + ' level:' + this.getPreparedSlotsLeftText(slotUsage);
        const slotsLeft = slotUsage[0];
        preparedHeading.find('span').text(text);
        if (slotsLeft < 0) {
            preparedHeading.addClass('negativeSlots');
        } else {
            preparedHeading.removeClass('negativeSlots');
        }
    }

    getPreparedSlotsLeftText(slotUsage) {
        const slotsLeft = slotUsage[0];
        let extra = slotUsage[1];
        let text = '';
        const slots = (slotsLeft === -1 || slotsLeft === 1) ? ' slot' : ' slots';
        if (slotsLeft < 0 && extra) {
            text += extra + ' remaining but ' + -slotsLeft + slots + ' over!';
        } else if (slotsLeft < 0) {
            text += ' ' + -slotsLeft + slots + ' over!';
        } else if (slotsLeft === 0 && extra) {
            text += extra + ' remaining';
        } else if (slotsLeft === 0) {
            text += ' no slots remaining';
        } else {
            if (extra) {
                if (extra.indexOf(' and') >= 0) {
                    extra = ',' + extra;
                } else {
                    extra = ' and' + extra;
                }
            }
            text +=' ' + slotsLeft + slots + extra + ' remaining';
        }
        return text;
    }

    dropSpell(evt, ui) {
        const droppable = $(evt.target);
        const category = droppable.data('psb_category');
        const spellName = ui.draggable.find('.title').text();
        const spellKey = spellName.toId();
        const spell = this.spellData.spellById[spellKey];
        let level;
        if (droppable.is('.knownSpellsDiv')) {
            ui.draggable.hide();
            level = $(ui.draggable.context).data('psb_preparedLevel');
            const index = this.copy.preparedSpells[category][level].indexOf(spellKey);
            if (index >= 0) {
                this.copy.preparedSpells[category][level].splice(index, 1);
                this.updatePreparedHeading(category, level);
            }
        } else {
            level = droppable.data('psb_level');
            if (!this.copy.preparedSpells[category]) {
                this.copy.preparedSpells[category] = {};
            }
            if (!this.copy.preparedSpells[category][level]) {
                this.copy.preparedSpells[category][level] = [];
            }
            this.copy.preparedSpells[category][level].push(spellKey);
            let target = evt.currentTarget;
            if (target.tagName.toLowerCase() === 'h4') {
                target = $(target).next();
            } else {
                target = $(target);
            }
            this.addPreparedSpell(target, spell, level, category);
            target.children().sort(function (o1, o2) {
                const v1 = $(o1).find('.title').text();
                const v2 = $(o2).find('.title').text();
                if (v1 < v2) {
                    return -1;
                } else if (v1 > v2) {
                    return 1;
                } else {
                    return 0;
                }
            }).detach().appendTo(target);
        }
    }

    onPrepareSpellsApplyButton() {
        this.preparedSpells = this.copy.preparedSpells;
        this.copy = null;
        this.storage.set(BookKeys.keyPreparedSpells, this.preparedSpells);
        this.back();
    }

    showSpellStorePanel() {
        this.showLoading($('#spellStore'), this.populateSpellStorePanel.bind(this));
    }

    populateSpellStorePanel() {
        $('#spellStore .ui-sortable').sortable('destroy');
        $.each(this.savedSpellListNames, (index, listName) => {
            this.appendSavedList(listName);
        });
        $('#spellStore').sortable({
            axis: 'y',
            containment: 'parent',
            helper: function(evt, element) {
                return $(element).clone().position({ my: "left", at: "left", of: element });
            },
            stop: () => {
                this.savedSpellListNames = $('.savedSpellLists').map(function () { return $(this).data('name') } ).get();
                this.storage.set(BookKeys.keySavedSpellListNames, this.savedSpellListNames);
            }
        });
    }

    appendSavedList(listName) {
        const listElt = $('<div/>').addClass('savedSpellLists').text(listName).data('name', listName);
        $('#spellStore').append(listElt);
        listElt.on('tap', (evt) => {
            $('.selectedSpellList').removeClass('selectedSpellList');
            $(evt.currentTarget).addClass('selectedSpellList');
        });
    }

    onSpellStoreSaveButton() {
        const selectedName = $('.selectedSpellList').data('name') || undefined;
        const listName = window.prompt("Enter a name for your saved spell list.", selectedName).trim();
        if (listName) {
            if (this.savedSpellLists[listName]) {
                if (!window.confirm('Overwrite ' + listName + ' list?')) {
                    return;
                }
            } else {
                this.savedSpellListNames.push(listName);
                this.storage.set(BookKeys.keySavedSpellListNames, this.savedSpellListNames);
                this.appendSavedList(listName);
            }
            const list = this.copy.preparedSpells;
            this.savedSpellLists[listName] = $.extend(true, {}, list);
            this.storage.set(BookKeys.keySavedSpellLists, this.savedSpellLists);
        }
    }

    onSpellStoreLoadButton() {
        const selectedName = $('.selectedSpellList').data('name');
        if (selectedName) {
            this.copy = {
                preparedSpells: $.extend(true, {}, this.savedSpellLists[selectedName])
            };
            this.back();
        }
    }

    onSpellStoreDeleteButton() {
        const $selectedSpellList = $('.selectedSpellList');
        const selectedName = $selectedSpellList.data('name');
        if (selectedName && window.confirm('Delete saved "' + selectedName + '" list?')) {
            const index = this.savedSpellListNames.indexOf(selectedName);
            if (index >= 0) {
                this.savedSpellListNames.splice(index, 1);
                delete(this.savedSpellLists[selectedName]);
                this.storage.set(BookKeys.keySavedSpellListNames, this.savedSpellListNames);
                this.storage.set(BookKeys.keySavedSpellLists, this.savedSpellLists);
                $selectedSpellList.remove();
            }
        }
    }

}

//=========================================================================================


$(document).ready(function () {
    const globalSettings = new Storage();
    globalSettings.setDefault('dataSize', 8003493);
    $('#loadingMessage').text('Loading spell list from pathfindercommunity.net...');
    $('#progress').progressbar({ max: globalSettings.get('dataSize'), value: 0 });
    $('#loading').show();
    // Now load the data.
    $.ajax({
        url:'https://docs.google.com/spreadsheets/d/1cuwb3QSvWDD7GG5McdvyyRBpqycYuKMRsXgyrvxvLFI/export?format=csv',
        xhr: function () {
            const xhr = new window.XMLHttpRequest();
            xhr.addEventListener('progress', function (evt) {
                $('#progress').progressbar('option', 'value', evt.loaded);
            });
            return xhr;
        },
        dataType: 'text'
    })
    .then(function (data) {
        globalSettings.set('dataSize', data.length);
        $('#loadingMessage').text('Parsing CSV...');
        const $progress = $('#progress');
        $progress.progressbar('option', 'value', 0);
        let nextNewline = data.indexOf('\r') + 2;
        const headingRow = data.substring(0, nextNewline);
        const chunkLen = parseInt(data.length / 100);
        const chunks = [];
        for (let pos = nextNewline; pos < data.length; ) {
            nextNewline = data.indexOf('\r', pos + chunkLen) + 2;
            if (nextNewline > 1) {
                chunks.push(data.substring(pos, nextNewline));
                pos = nextNewline;
            } else {
                chunks.push(data.substring(pos));
                pos = data.length;
            }
        }
        $progress.progressbar('option', 'max', chunks.length);
        return $.Deferred(function (defer) {
            let chunkIndex = -1;
            let headings;
            let spellList = [];
            const loop = function () {
                if (chunkIndex === -1) {
                    $.csv.toArray(headingRow, {}, function (err, arr) {
                        if (err) {
                            defer.reject(err);
                        } else {
                            headings = arr;
                            window.setTimeout(loop, 0);
                        }
                    });
                } else {
                    const chunk = headingRow + chunks[chunkIndex];
                    $.csv.toObjects(chunk, {}, function (err, objects) {
                        if (err) {
                            defer.reject(err);
                        } else {
                            spellList = spellList.concat(objects);
                            if (chunkIndex >= chunks.length) {
                                defer.resolve(headings, spellList);
                            } else {
                                window.setTimeout(loop, 0);
                            }
                        }
                    });
                }
                $('#progress').progressbar('option', 'value', ++chunkIndex);
            };
            loop();
        });
    })
    .then(function (headings, spellList) {
        $('#loadingMessage').text('Processing spell data...');
        const $progress = $('#progress');
        $progress.progressbar('option', 'max', spellList.length);
        $progress.progressbar('option', 'value', 0);
        const spellData = new SpellData(headings, spellList, function (index) {
            $('#progress').progressbar('option', 'value', index);
        });
        new TopMenu(globalSettings, spellData);
    })
    .fail(function (err, textStatus, errorThrown) {
        console.error(err, textStatus, errorThrown);
        $('#loading').text('Error: unable to contact spreadsheets.google.com ' + textStatus);
    });
    /*
    $('.panel').hide();
    $.csv.toObjects(globalSpellCsv, {}, function (err, spellList) {
        if (err) {
            console.error(err);
        } else {
            const headingRow = globalSpellCsv.substring(0, globalSpellCsv.search(/[\r\n]/));
            $.csv.toArray(headingRow, {}, function (err, headings) {
                if (err) {
                    console.error(err);
                } else {
                    new TopMenu(globalSettings, new SpellData(headings, spellList));
                }
            });
        }
    });
    */
});
