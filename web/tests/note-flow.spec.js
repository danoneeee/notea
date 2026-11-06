import { expect, test } from '@playwright/test';

test('user can create, restore draft, edit and delete a note', async ({ page }) => {
  page.on('dialog', (dialog) => dialog.accept());
  const email = `e2e-${Date.now()}@notea.test`;

  const basicsInputs = page.locator('input');
  const basicsTypeSelect = page.locator('select').first();
  const optionalBasicsSelects = page.locator('.optional-grid select');
  const finishSelects = page.locator('.finish-top-fields select');

  await page.goto('/');
  await page.getByRole('button', { name: 'Начать бесплатно' }).click();
  await page.getByRole('button', { name: 'Регистрация', exact: true }).click();
  await page.getByLabel('Имя').fill('E2E Чаевод');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Пароль').fill('e2e-password-123');
  await page.getByRole('button', { name: 'Создать аккаунт' }).click();
  await expect(page).toHaveURL(/\/app\/notes$/);

  await page.getByRole('button', { name: 'Новая заметка' }).click();
  await expect(page).toHaveURL(/\/app\/notes\/new/);

  await basicsInputs.nth(0).fill('Тестовая сессия');
  await basicsInputs.nth(1).fill('Тестовый улун');
  await basicsTypeSelect.selectOption('Улун');
  await page.getByRole('button', { name: /Показать опциональные поля/ }).click();
  await optionalBasicsSelects.nth(0).selectOption('Китай');
  await optionalBasicsSelects.nth(1).selectOption('Фуцзянь');
  await optionalBasicsSelects.nth(2).selectOption('autumn');
  await page.getByPlaceholder('2024', { exact: true }).fill('2024');
  await page.locator('textarea').first().fill('Черновик с новой географией.');

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
  await finishSelects.nth(0).selectOption('gold');
  await finishSelects.nth(1).selectOption('silky');
  await finishSelects.nth(2).selectOption('focused');
  await page.locator('textarea').last().fill('Финальные заметки для smoke-сценария.');
  await page.getByRole('button', { name: 'Сохранить заметку' }).click();

  await expect(page).toHaveURL(/\/app\/notes\//);
  await expect(page.getByRole('heading', { name: 'Тестовый улун' })).toBeVisible();
  await expect(page.getByText('Китай', { exact: true })).toBeVisible();
  await expect(page.getByText('Фуцзянь', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Редактировать заметку' }).click();
  await expect(page).toHaveURL(/\/edit$/);
  const teaNameInput = page.getByPlaceholder('Например, Лао Бан Чжан, Да Хун Пао, Бай Му Дань');
  await expect(teaNameInput).toHaveValue('Тестовый улун');
  await teaNameInput.fill('Тестовый улун edited');
  await expect(teaNameInput).toHaveValue('Тестовый улун edited');

  await page.getByRole('button', { name: 'Далее' }).click();
  await page.getByRole('button', { name: 'Далее' }).click();
  await page.getByRole('button', { name: 'Далее' }).click();
  await page.getByRole('button', { name: 'Сохранить изменения' }).click();

  await expect(page.getByRole('heading', { name: 'Тестовый улун edited' })).toBeVisible();

  await page.getByRole('button', { name: 'Удалить заметку' }).click();
  await expect(page).toHaveURL(/\/app\/notes$/);
  await expect(page.getByText('Тестовый улун edited')).toHaveCount(0);
});
