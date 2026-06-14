import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

type AxeBuilderOptions = ConstructorParameters<typeof AxeBuilder>[0];
type MockApiMode = "empty" | "error" | "loading" | "long" | "never-ask" | "trash-failure";

class SwipeTrashPage {
  readonly page: Page;
  readonly card: Locator;
  readonly fileName: Locator;

  constructor(page: Page) {
    this.page = page;
    this.card = page.getByTestId("swipe-card");
    this.fileName = page.getByTestId("file-name");
  }

  async start() {
    await this.page.goto("/");
    await expect(this.page.getByTestId("tutorial-dialog")).toBeVisible();
    await this.page.getByRole("button", { name: "Start" }).click();
    await expect(this.card).toBeVisible();
  }

  async swipe(direction: "left" | "right") {
    const box = await this.card.boundingBox();
    expect(box).not.toBeNull();
    if (!box) {
      return;
    }

    const startX = box.x + box.width / 2;
    const startY = box.y + box.height * 0.52;
    const delta = direction === "right" ? 190 : -190;

    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    await this.page.mouse.move(startX + delta * 0.45, startY + 8, { steps: 8 });

    const transform = await this.card.evaluate((element) => getComputedStyle(element).transform);
    expect(transform).not.toBe("none");

    await this.page.mouse.move(startX + delta, startY + 14, { steps: 10 });
    await this.page.mouse.up();
  }
}

function createAxeBuilder(page: Page) {
  return new AxeBuilder({ page: page as unknown as AxeBuilderOptions["page"] });
}

async function installMockApi(page: Page, mode: MockApiMode) {
  await page.addInitScript((mockMode) => {
    const settings = {
      includeDocuments: true,
      includeDownloads: true,
      dailyGoal: 12,
      minAgeDays: 7
    };
    let dayStats = { kept: 0, trashed: 0, trashedBytes: 0 };
    const totals = { trashed: 0, trashedBytes: 0 };
    const neverAskCandidates = [
      {
        id: "never-ask-first",
        name: "Screenshot 2025-11-03.png",
        path: "/mock/Downloads/Screenshot 2025-11-03.png",
        directory: "/mock/Downloads",
        rootLabel: "Downloads",
        extension: "PNG",
        kind: "image",
        size: 1843200,
        sizeLabel: "1.8 MB",
        modifiedAt: new Date("2025-11-03T10:00:00.000Z").toISOString(),
        ageDays: 58,
        reason: "Screenshot · Old file",
        score: 4,
        previewUrl: "",
        textPreview: ""
      },
      {
        id: "never-ask-second",
        name: "Export-notes.txt",
        path: "/mock/Documents/Export-notes.txt",
        directory: "/mock/Documents",
        rootLabel: "Documents",
        extension: "TXT",
        kind: "text",
        size: 6800,
        sizeLabel: "7 KB",
        modifiedAt: new Date("2025-10-10T10:00:00.000Z").toISOString(),
        ageDays: 120,
        reason: "Old file",
        score: 1,
        previewUrl: "",
        textPreview: "Temporary list"
      }
    ];
    const longCandidate = {
      id: "long-file",
      name: "Super-long-export-name-with-client-copy-final-final-final-final-version-that-should-never-break-layout.zip",
      path: "/mock/Downloads/Super-long-export-name-with-client-copy-final-final-final-final-version-that-should-never-break-layout.zip",
      directory: "/mock/Downloads/a/very/deep/path/with/a/long/folder/name/that/should/stay/contained",
      rootLabel: "Downloads",
      extension: "ZIP",
      kind: "archive",
      size: 42800123,
      sizeLabel: "42.8 MB",
      modifiedAt: new Date("2025-11-06T12:00:00.000Z").toISOString(),
      ageDays: 90,
      reason: "Archive · Likely duplicate with a very long explanation",
      score: 6,
      previewUrl: "",
      textPreview: ""
    };
    const firstFailureCandidate = {
      ...longCandidate,
      id: "failed-trash-file",
      name: "Still-here-after-trash-failure.zip",
      path: "/mock/Downloads/Still-here-after-trash-failure.zip"
    };
    const secondFailureCandidate = {
      ...longCandidate,
      id: "next-file",
      name: "Next-file-should-not-show.txt",
      path: "/mock/Downloads/Next-file-should-not-show.txt",
      extension: "TXT",
      kind: "text",
      size: 1200,
      textPreview: "This card should not become current after a failed trash action."
    };

    window.localStorage.setItem("swipetrash.onboarded", "1");
    (window as unknown as { swipeTrash: unknown }).swipeTrash = {
      async getCandidates() {
        if (mockMode === "loading") {
          return new Promise(() => undefined);
        }
        if (mockMode === "error") {
          throw new Error("Mock scan failed");
        }
        const candidates =
          mockMode === "long"
            ? [longCandidate]
            : mockMode === "never-ask"
              ? neverAskCandidates
            : mockMode === "trash-failure"
              ? [firstFailureCandidate, secondFailureCandidate]
              : [];
        return {
          candidates,
          settings,
          stats: {
            scanned: candidates.length,
            filtered: 0,
            missingRoots: [],
            roots: ["Documents", "Downloads"]
          },
          day: new Date().toISOString().slice(0, 10),
          dayStats,
          totals
        };
      },
      async recordKeep() {
        dayStats = { ...dayStats, kept: dayStats.kept + 1 };
        return { ok: true, dayStats, totals };
      },
      async recordKeepAlways(filePath: string) {
        window.localStorage.setItem("swipetrash.test.hiddenPath", filePath);
        dayStats = { ...dayStats, kept: dayStats.kept + 1 };
        return { ok: true, dayStats, totals };
      },
      async forgetDecision() {
        return { ok: true, dayStats, totals };
      },
      async trashFiles() {
        if (mockMode === "trash-failure") {
          return {
            results: [{ path: firstFailureCandidate.path, ok: false, error: "Mock trash failed" }],
            dayStats,
            totals,
            nativeSoundPlayed: true
          };
        }
        return { results: [], dayStats, totals, nativeSoundPlayed: true };
      },
      async openFile() {
        return { ok: true };
      },
      async revealFile() {
        return { ok: true };
      }
    };
  }, mode);
}

async function expectViewportContained(page: Page) {
  const hasOverflow = await page.evaluate(() => {
    const root = document.documentElement;
    return root.scrollWidth > root.clientWidth || root.scrollHeight > root.clientHeight;
  });
  expect(hasOverflow).toBe(false);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.localStorage.setItem("swipetrash.language", "en");
  });
});

test("reviews files with swipe actions and updates statistics", async ({ page }) => {
  const app = new SwipeTrashPage(page);
  await app.start();

  await expect(app.fileName).toHaveText("Screenshot 2025-11-03.png");
  await expect(page.getByTestId("file-meta")).toContainText("1.8 MB");

  await app.swipe("right");
  await expect(app.fileName).toHaveText("Export-notes.txt");
  await expect(page.getByText("1 / 12")).toBeVisible();

  await app.swipe("left");
  await expect(app.fileName).toHaveText("Installer-copy.dmg");
  await expect(page.getByText("2 / 12")).toBeVisible();

  await page.getByTestId("settings-button").click();
  const settings = page.getByTestId("settings-dialog");
  await expect(settings).toBeVisible();
  await expect(settings).toContainText("Files deleted");
  await expect(settings).toContainText("Data removed");
  await expect(settings).toContainText("6.8 KB");
});

test("supports language switching, Escape, and keyboard review", async ({ page }) => {
  const app = new SwipeTrashPage(page);
  await app.start();

  await page.getByTestId("settings-button").click();
  await page.getByLabel("Language").selectOption("fr");
  await expect(page.getByRole("heading", { name: "Tri quotidien" })).toBeVisible();
  await expect(page.getByTestId("settings-dialog")).toContainText("Réglages");

  for (let index = 0; index < 10; index += 1) {
    await page.keyboard.press("Tab");
    const focusInsideDialog = await page.evaluate(() => Boolean(document.activeElement?.closest("[data-testid='settings-dialog']")));
    expect(focusInsideDialog).toBe(true);
  }

  await page.keyboard.press("Shift+Tab");
  const reverseFocusInsideDialog = await page.evaluate(() => Boolean(document.activeElement?.closest("[data-testid='settings-dialog']")));
  expect(reverseFocusInsideDialog).toBe(true);

  await page.keyboard.press("Escape");
  await expect(page.getByTestId("settings-dialog")).toBeHidden();

  await page.keyboard.press("ArrowRight");
  await expect(app.fileName).toHaveText("Export-notes.txt");
  await expect(page.getByText("1 / 12")).toBeVisible();
});

test("keeps the compact layout contained", async ({ page }) => {
  const app = new SwipeTrashPage(page);
  await app.start();

  await expect(app.card).toBeVisible();
  await expect(page.getByRole("button", { name: "Reveal in folder" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open preview" })).toBeVisible();
  await expectViewportContained(page);
});

test("can keep a file and hide it from future scans", async ({ page }) => {
  await installMockApi(page, "never-ask");
  await page.goto("/");

  const app = new SwipeTrashPage(page);
  await expect(app.card).toBeVisible();

  await expect(app.fileName).toHaveText("Screenshot 2025-11-03.png");
  await page.getByRole("button", { name: "Never ask again" }).click();

  await expect(app.fileName).toHaveText("Export-notes.txt");
  await expect(page.getByText("1 / 12")).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Kept and hidden from future scans.");

  const hiddenPath = await page.evaluate(() => window.localStorage.getItem("swipetrash.test.hiddenPath"));
  expect(hiddenPath).toBe("/mock/Downloads/Screenshot 2025-11-03.png");
});

test("passes automated accessibility checks on main and settings views", async ({ page }) => {
  const app = new SwipeTrashPage(page);
  await app.start();

  const mainResults = await createAxeBuilder(page).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(mainResults.violations).toEqual([]);

  await page.getByTestId("settings-button").click();
  await expect(page.getByTestId("settings-dialog")).toBeVisible();

  const settingsResults = await createAxeBuilder(page).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(settingsResults.violations).toEqual([]);
});

test("shows a stable loading state", async ({ page }) => {
  await installMockApi(page, "loading");
  await page.goto("/");

  await expect(page.getByTestId("loading-state")).toBeVisible();
  await expect(page.getByTestId("loading-state")).toContainText("Scanning");
});

test("shows a retryable error state", async ({ page }) => {
  await installMockApi(page, "error");
  await page.goto("/");

  await expect(page.getByTestId("error-state")).toBeVisible();
  await expect(page.getByTestId("error-state")).toContainText("Mock scan failed");
  await expect(page.getByRole("button", { name: "Refresh" })).toBeVisible();
  await expectViewportContained(page);
});

test("shows an empty state with refresh", async ({ page }) => {
  await installMockApi(page, "empty");
  await page.goto("/");

  await expect(page.getByTestId("empty-state")).toBeVisible();
  await expect(page.getByTestId("empty-state")).toContainText("Nothing to review");
  await expect(page.getByRole("button", { name: "Refresh" })).toBeVisible();
  await expectViewportContained(page);
});

test("contains long file names and metadata without viewport overflow", async ({ page }) => {
  await installMockApi(page, "long");
  await page.goto("/");

  await expect(page.getByTestId("swipe-card")).toBeVisible();
  await expect(page.getByTestId("file-name")).toContainText("Super-long-export-name");
  await expect(page.getByTestId("file-meta")).toContainText("42.8 MB");
  await expectViewportContained(page);
});

test("keeps the same card visible when moving to trash fails", async ({ page }) => {
  await installMockApi(page, "trash-failure");
  await page.goto("/");

  const app = new SwipeTrashPage(page);
  await expect(app.card).toBeVisible();
  await expect(app.fileName).toHaveText("Still-here-after-trash-failure.zip");

  await app.swipe("left");

  await expect(page.getByRole("alert")).toContainText("Mock trash failed");
  await expect(app.fileName).toHaveText("Still-here-after-trash-failure.zip");
  await expect(page.getByText("0 / 12")).toBeVisible();
});
