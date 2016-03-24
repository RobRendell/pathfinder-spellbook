# pathfinder-spellbook
A webapp to track the casting of spells while playing a spellcaster in Pathfinder.

This webapp loads the spell database from pathfindercommunity.net on startup.  The user can then create "spellbooks" for each character
they use, and configure it appropriately, essentially by just working down the buttons in the book menu.

The "Edit spellbook details" button shows a panel where you can pick the options for that spellbook - the name of the book/character,
which sourcebooks to use, the character's class(es), and any applicable domains, bloodline, patron and/or favoured and opposed schools.
There is also an option to delete the spellbook.  Changes are not saved until the "Apply" button is hit.


The "Edit spell slots" button shows a panel where you can enter the number of spells you can cast in a day for each of that character's
classes.  If the character has multiple classes, options to associate any selected domains/bloodline etc. with their appropriate class
also appear.  Changes are not saved until the "Apply" button is hit.

The "Edit spells known." button leads to a panel where you can select which of your class spells you personally have available.  For
divine classes which have access to the entire spell list, they can click the "select all" link to tick all the spells in a given
category.  Again, changes are not saved until the "Apply" button is hit.

The "Adventuring" button shows the panel where you can actually track your spell usage while gaming, and includes a "Rest and recover
spells" button to reset all used spell slots.  Unlike the rest of the app, changes made in this panel are saved whenever they are
made - there is no "Apply" button in this panel.

Spontaneous casters just see all their known spells, and a row of checkboxes is shown for each level which tick off as you tap them or
the spells.  If a slot is accidentally marked off, a long-click or long-press will untick the level's spell slot.

Prepared casters tap individual spells to cross them off, or long-click or long-press them to restore them (if they were accidentally
tapped, or if the character uses a Pearl of Power or similar during play).  They also have another panel behind the Adventuring one
where they can choose which spells that they're preparing for the day.  They can save multiple different lists of spells for different
occasions, which they can switch between and tinker with without peturbing their currently active spells for the day.  The current
spell selection is only changed when they hit the "Apply" button.
