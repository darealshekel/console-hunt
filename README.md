# מצוד אחר הקונסולה

משחק פלטפורמות מצויר לדפדפן בטלפון. רצים, קופצים ואוספים קונסולות PS5 בחמישה שלבים, עד לקרב מול מלך הקונסולות.

**[למשחק — פותחים בטלפון](https://darealshekel.github.io/console-hunt/)**

## איך משחקים

- מחזיקים את חצי הכיוון כדי לרוץ.
- מחזיקים קפיצה לקפיצה גבוהה; נוגעים שוב באוויר לקפיצה כפולה.
- דאש מזניק קדימה ופוגע בשומרים. מחכים שהכפתור ייטען לפני הדאש הבא.
- קופצים מעל קוצים ובורות, ואוספים לבבות ודגלי נקודת חזרה.
- מול הבוס זזים הצידה בזמן האזהרה, קופצים מעל גלי הפגיעה, ותוקפים כשהוא מסוחרר.

המשחק תומך במצב אנכי ואופקי, בכמה אצבעות בו־זמנית ובשמירה אוטומטית של שלבים שהושלמו. מעבר לאפליקציה אחרת משהה את המשחק. במחשב ללא מסך מגע מוצגת הפניה לטלפון. אפשר להוסיף למסך הבית; אחרי הטעינה הראשונה המשחק זמין גם ללא חיבור.

## The game

Five courses: beach, rooftops, dunes, night harbor, and warehouse. The sixth scene is a two-phase boss encounter. The first course includes the supplied advertisement as a background billboard. Character illustrations were generated from the supplied reference photographs; the original photographs are not included.

Canvas 2D, plain JavaScript modules, Pointer Events, and original synthesized Web Audio. No runtime packages, accounts, analytics, backend, or external asset requests. Progress stays in this browser's local storage. Clearing browser storage resets progress.

## Local development

Requires Node.js 22 or newer. No install step:

```sh
npm start
npm test
```

Open `http://127.0.0.1:4173` in touch-device emulation, or serve the folder to a phone. `PORT` can override the local server port. Localhost-only hooks support isolated UI test fixtures; production does not expose them.

`tests/engine.test.js` verifies controls, collisions, checkpoints, moving platforms, boss phases, and completing every course using normal movement inputs. `tests/mobile-checks.js` is a Playwright CLI `run-code` script for a touch-enabled Chromium session, using a local test server on port 4175. It covers simultaneous touches, pause/resume, small screens, landscape, progress persistence, results, boss victory, and the desktop gate. Screenshots go in the ignored `output/playwright/` folder.

## Assets

Rubik and Amatic SC are bundled under the SIL Open Font License; license files are in `assets/`. The character atlas and the user-supplied billboard are separate assets. Scenery, consoles, enemies, UI, and effects are drawn in code. Music and sound effects are synthesized locally after the first interaction.

When changing cached assets, increment the cache version in `sw.js` before publishing.
