import { expect, test } from '@playwright/test';

test('user can create, restore draft, edit and delete a note', async ({ page }) => {
  page.on('dialog', (dialog) => dialog.accept());

  await page.goto('/');
  await page.getByRole('button', { name: 'Демо-вход' }).click();
  await expect(page).toHaveURL(/\/app\/notes$/);

  await page.getByRole('button', { name: 'Новая заметка' }).click();
  await expect(page).toHaveURL(/\/app\/notes\/new/);

  await page.getByRole('textbox', { name: 'Название сессии / церемонии' }).fill('Тестовая сессия');
  await page.getByRole('textbox', { name: 'Название чая' }).fill('Тестовый улун');
  await page.getByRole('combobox', { name: 'Тип' }).selectOption('Улун');
  await page.getByPlaceholder('Начни вводить регион').fill('Фуцзянь');

  await page.getByRole('button', { name: 'Сохранить черновик' }).click();
  await expect(page.getByText('Черновик сохранён локально')).toBeVisible();

  await page.getByRole('button', { name: 'К заметкам' }).click();
  await expect(page).toHaveURL(/\/app\/notes$/);
  await expect(page.getByText('Тестовый улун')).toBeVisible();

  await page.getByRole('button', { name: 'Продолжить' }).click();
  await expect(page).toHaveURL(/\/app\/notes\/new/);

  await page.getByRole('button', { name: 'Далее' }).click();
  await page.getByPlaceholder('7').fill('7');
  await page.getByPlaceholder('100').fill('100');
  await page.getByPlaceholder('95').fill('95');
  await page.getByPlaceholder('10', { exact: true }).fill('15');
  await page.getByRole('button', { name: 'Далее' }).click();
  await page.getByRole('button', { name: 'Далее' }).click();

  const ratingRows = page.locator('.rating-row');
  await ratingRows.nth(0).locator('button').nth(3).click();
  await ratingRows.nth(1).locator('button').nth(3).click();
  await ratingRows.nth(2).locator('button').nth(3).click();
  await ratingRows.nth(3).locator('button').nth(3).click();
  await page.getByRole('button', { name: 'Сохранить заметку' }).click();

  await expect(page).toHaveURL(/\/app\/notes\//);
  await expect(page.getByRole('heading', { name: 'Тестовый улун' })).toBeVisible();

  await page.getByRole('button', { name: 'Редактировать заметку' }).click();
  await expect(page).toHaveURL(/\/edit$/);
  await page.getByRole('textbox', { name: 'Название чая' }).fill('Тестовый улун edited');

  await page.getByRole('button', { name: 'Далее' }).click();
  await page.getByRole('button', { name: 'Далее' }).click();
  await page.getByRole('button', { name: 'Далее' }).click();
  await page.getByRole('button', { name: 'Сохранить изменения' }).click();

  await expect(page.getByRole('heading', { name: 'Тестовый улун edited' })).toBeVisible();

  await page.getByRole('button', { name: 'Удалить заметку' }).click();
  await expect(page).toHaveURL(/\/app\/notes$/);
  await expect(page.getByText('Тестовый улун edited')).toHaveCount(0);
});
