## 1. Обзор проекта

**Название:** Bible Note

**Платформы:** iOS, Android (Flutter)

**Описание:** Приложение для записи, транскрипции и AI-анализа аудио (лекции, проповеди, митинги). Ключевые фичи: запись аудио, AI-транскрипция, AI-саммари, генерация Insight-карточек.

**Языки:** Русский, Английский, Испанский, Украинский, Португальский

**Вдохновение:** Функционал вдохновлён приложением [Bible Notes](https://apps.apple.com/us/app/bible-notes/id6453161701) из App Store.

---

## 1.1 Фазы разработки

### MVP (Первый релиз) — Локальное приложение

**Фокус:** Полнофункциональное приложение для работы с аудио-заметками и AI-анализом без авторизации и облачной синхронизации.

**Включает:**

- ✅ Запись аудио, загрузка аудио, импорт из YouTube
- ✅ AI-функционал: транскрипция, AI-саммари, генерация Insight-карточек
- ✅ Локальное хранилище (SQLite через Drift)
- ✅ Организация заметок в папки
- ✅ Шеринг заметок (создание shared links, экспорт Insight-карточек)
- ✅ Полная локализация на 5 языков
- ✅ Все экраны основного flow (Notes, Recording, Note Detail, Settings, Folders)
- ✅ Дизайн-система (Warm Modern Minimalism, Light/Dark mode)
- ✅ Офлайн-режим (все данные локально)
- ✅ Push-уведомления (транскрипция готова, напоминания)
- ✅ Подписки через RevenueCat (Free, Plus, Pro)

**Исключает:**

- ❌ Авторизация (Google, Apple, Anonymous)
- ❌ Управление аккаунтом
- ❌ Облачная синхронизация заметок
- ❌ Виджеты (iOS, Android)
- ❌ Работа с Библией (чтение, интеграция стихов)

### Вторая итерация — Полный функционал

**Дополнительные фичи:**

- ✅ OAuth авторизация (Google Sign-In, Apple Sign-In, Anonymous)
- ✅ Управление аккаунтом (привязка/отвязка провайдеров, удаление аккаунта)
- ✅ Облачная синхронизация заметок через Parse Server
- ✅ **Интеграция Библии:**
- Отдельная вкладка для чтения Библии
- Автодополнение стихов в заметках (например, "Иоанн 3:16" → полный текст стиха)
- Всплывающие стихи (popup) при клике на ссылку
- Один перевод Библии на каждый язык (всего 5 переводов)
- Кастомизация чтения (шрифты, цвета, подсветка)
- Поиск и навигация по книгам/главам/стихам
- ✅ Нативные виджеты (iOS через SwiftUI, Android через Jetpack Compose)

---

## 2. Технологический стек

### Flutter

| **Категория**    | **Пакет**                                                  |
| ---------------- | ---------------------------------------------------------- |
| State Management | flutter_bloc                                               |
| Routing          | go_router                                                  |
| Network          | dio                                                        |
| Code Generation  | freezed, json_serializable                                 |
| Localization     | flutter_intl (intl, intl_utils)                            |
| DI               | get_it + injectable                                        |
| Local Storage    | drift (SQLite), shared_preferences, flutter_secure_storage |
| Audio            | record, just_audio                                         |
| Auth             | google_sign_in, sign_in_with_apple                         |
| Payments         | purchases_flutter (RevenueCat)                             |
| Push             | firebase_messaging                                         |
| Analytics        | firebase_analytics                                         |
| Deep Links       | go_router + firebase_dynamic_links                         |
| Image Picker     | image_picker                                               |
| File Picker      | file_picker                                                |
| Share            | share_plus                                                 |
| Permissions      | permission_handler                                         |

### Backend (Parse Server)

- Parse Server на Node.js
- Cloud Functions для AI-интеграции
- File Storage для аудио (S3-compatible)
- Push через Firebase Admin SDK

---

## 3. Архитектура

### Слои (Clean Architecture)

```other
lib/
├── core/
│ ├── constants/
│ ├── errors/
│ ├── network/
│ ├── router/
│ └── theme/
├── features/
│ └── [feature_name]/
│ ├── data/
│ │ ├── datasources/
│ │ ├── models/
│ │ └── repositories/
│ ├── domain/
│ │ ├── entities/
│ │ ├── repositories/
│ │ └── usecases/
│ └── presentation/
│ ├── bloc/
│ ├── pages/
│ └── widgets/
└── shared/
├── widgets/
└── extensions/
```

### Features

- auth *(Итерация 2)*
- notes
- recording
- transcription
- folders
- insights
- settings
- subscription
- bible *(Итерация 2)*

### Принципы

- Каждый UseCase = один метод `call()`
- Bloc на каждую страницу + shared blocs (AuthBloc, SubscriptionBloc)
- Repository Pattern с абстракциями в domain
- Offline-first: локальное сохранение (синхронизация добавляется в Итерации 2)

---

## 4. Экраны приложения

### 4.1 Auth Flow **[ИТЕРАЦИЯ 2]**

| **Экран**    | **Описание**                                     |
| ------------ | ------------------------------------------------ |
| SplashScreen | Логотип, проверка авторизации                    |
| AuthScreen   | Кнопки: Google, Apple, "Продолжить без аккаунта" |

> **Примечание для MVP:** В первом релизе авторизация отсутствует. Приложение сразу открывается на Main Flow (NotesListScreen). SplashScreen может быть реализован для брендинга, но без проверки авторизации.

### 4.2 Main Flow (Bottom Navigation) **[MVP + ИТЕРАЦИЯ 2]**

| **Tab**   | **Экран**             | **Описание**                                         | **Фаза**                              |
| --------- | --------------------- | ---------------------------------------------------- | ------------------------------------- |
| Notes     | NotesListScreen       | Список заметок с фильтром All/Folder, поиск          | MVP                                   |
| (+)       | —                     | FAB открывает NewNoteBottomSheet                     | MVP                                   |
| **Bible** | **BibleReaderScreen** | **Чтение Библии, навигация по книгам/главам/стихам** | **Итерация 2**                        |
| Settings  | SettingsScreen        | Подписка, аккаунт, о приложении                      | MVP (упрощённый), Итерация 2 (полный) |

> **Примечание для MVP:** Вкладка Bible отсутствует в первом релизе. Bottom Navigation содержит только: Notes, FAB (+), Settings (всего 3 элемента).

### 4.3 Notes Flow **[MVP]**

| **Экран**           | **Описание**                                                         | **Фаза**      |
| ------------------- | -------------------------------------------------------------------- | ------------- |
| NewNoteBottomSheet  | Выбор: Record Audio, YouTube Link, Upload Audio, Scan Text           | MVP           |
| RecordingScreen     | Запись аудио с таймером и визуализацией                              | MVP           |
| YouTubeLinkScreen   | Ввод URL, парсинг субтитров                                          | MVP           |
| NoteDetailScreen    | Просмотр заметки с табами: AI Summary, Transcript, Insight, My Notes | MVP           |
| NoteEditorScreen    | Редактирование My Notes *(во Итерации 2 с автодополнением стихов)*   | MVP (базовый) |
| InsightViewerScreen | Просмотр/свайп Insight-карточек, шеринг                              | MVP           |
| ShareExportSheet    | Bottom sheet с опциями экспорта и создания shared link               | MVP           |

### 4.4 Folders Flow **[MVP]**

| **Экран**          | **Описание**                                                | **Фаза** |
| ------------------ | ----------------------------------------------------------- | -------- |
| FoldersScreen      | Список папок (доступен через tab Folder на NotesListScreen) | MVP      |
| FolderDetailScreen | Заметки внутри папки                                        | MVP      |
| CreateFolderDialog | Создание/редактирование папки                               | MVP      |

### 4.5 Settings Flow **[MVP + ИТЕРАЦИЯ 2]**

| **Экран**          | **Описание**                                 | **Фаза**      |
| ------------------ | -------------------------------------------- | ------------- |
| SettingsScreen     | Главный экран настроек                       | MVP (базовый) |
| SubscriptionScreen | Paywall с планами подписки                   | MVP           |
| AccountScreen      | Email, связанные аккаунты, удаление аккаунта | Итерация 2    |
| WidgetsPromoScreen | Промо виджетов с инструкцией по добавлению   | Итерация 2    |
| AboutScreen        | Версия, лицензии, ссылки                     | MVP           |
| FeedbackScreen     | Форма обратной связи                         | MVP           |

> **Примечание для MVP:** SettingsScreen в первом релизе содержит: Подписка, О приложении, Обратная связь, Выбор языка, Тема (Light/Dark), Уведомления.

---

## 5. Backend API (Parse Server)

### 5.1 Схемы данных (Classes)

**User** (стандартный Parse User)

```other
- objectId: String
- email: String?
- authData: Object (Google/Apple)
- subscriptionStatus: String (free|plus|pro)
- subscriptionExpiry: Date?
- language: String
- createdAt: Date
```

**Note**

```other
- objectId: String
- user: Pointer<User>
- title: String
- folder: Pointer<Folder>?
- sourceType: String (recording|youtube|upload|scan)
- sourceUrl: String? (для YouTube)
- audioFile: File?
- audioDuration: Number (секунды)
- transcript: String?
- aiSummary: String?
- myNotes: String?
- insights: Array<String>
- status: String (processing|ready|error)
- isDeleted: Boolean
- createdAt: Date
- updatedAt: Date
- syncedAt: Date?
```

**Folder**

```other
- objectId: String
- user: Pointer<User>
- name: String
- color: String?
- order: Number
- isDeleted: Boolean
- createdAt: Date
```

**SharedNote**

```other
- objectId: String
- note: Pointer<Note>
- shareToken: String (unique)
- expiresAt: Date?
- createdAt: Date
```

### 5.2 Cloud Functions

| **Функция**        | **Описание**                              | **Параметры**       | **Возвращает**              |
| ------------------ | ----------------------------------------- | ------------------- | --------------------------- |
| `transcribeAudio`  | Транскрипция аудио                        | noteId              | transcript                  |
| `generateSummary`  | AI-саммари                                | noteId              | summary                     |
| `generateInsights` | Генерация Insight-карточек                | noteId              | insights[]                  |
| `parseYouTube`     | Парсинг субтитров YouTube                 | url                 | transcript, title, duration |
| `processOCR`       | OCR для сканированного текста             | imageBase64         | text                        |
| `createShareLink`  | Создание ссылки для шеринга               | noteId, type        | shareUrl                    |
| `getSharedNote`    | Получение shared заметки                  | shareToken          | note data                   |
| `syncNotes`        | Синхронизация заметок *(Итерация 2)*      | notes[], lastSyncAt | updated[], deleted[]        |
| `deleteAccount`    | Удаление аккаунта и данных *(Итерация 2)* | —                   | success                     |

### 5.3 REST Endpoints (стандартные Parse)

- `POST /parse/classes/Note` — создание заметки
- `GET /parse/classes/Note` — получение заметок (с where)
- `PUT /parse/classes/Note/:id` — обновление заметки
- `DELETE /parse/classes/Note/:id` — удаление заметки
- Аналогично для Folder, ChatMessage

---

## 6. Авторизация (OAuth) **[ИТЕРАЦИЯ 2]**

> **Важно:** Авторизация реализуется только во второй итерации. В MVP приложение работает полностью локально без авторизации и аккаунтов.

### 6.1 Поддерживаемые методы

- Google Sign-In (OAuth 2.0)
- Sign in with Apple (OAuth 2.0)
- Anonymous (гостевой режим)

### 6.2 Auth Flow

```other
┌─────────────────────────────────────────────────────────────────┐
│ Google / Apple │
├─────────────────────────────────────────────────────────────────┤
│ 1. Пользователь нажимает "Continue with Google/Apple" │
│ 2. Flutter вызывает google_sign_in / sign_in_with_apple │
│ 3. Получаем idToken от провайдера │
│ 4. Отправляем idToken на Parse Server (Cloud Function) │
│ 5. Parse Server верифицирует токен через Google/Apple API │
│ 6. Parse создаёт/находит User с authData │
│ 7. Parse возвращает sessionToken │
│ 8. Flutter сохраняет sessionToken в secure storage │
│ 9. Все запросы к Parse идут с X-Parse-Session-Token header │
└─────────────────────────────────────────────────────────────────┘
  
┌─────────────────────────────────────────────────────────────────┐
│ Anonymous │
├─────────────────────────────────────────────────────────────────┤
│ 1. Пользователь нажимает "Continue without account" │
│ 2. Flutter генерирует уникальный UUID │
│ 3. Вызываем Parse anonymous login │
│ 4. Parse создаёт User с authData.anonymous │
│ 5. Данные хранятся локально + на сервере │
│ 6. При желании можно привязать Google/Apple позже │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 Cloud Functions для авторизации

| **Функция**      | **Описание**               | **Параметры**     | **Возвращает**     |
| ---------------- | -------------------------- | ----------------- | ------------------ |
| `authWithGoogle` | Авторизация через Google   | idToken           | sessionToken, user |
| `authWithApple`  | Авторизация через Apple    | idToken, nonce    | sessionToken, user |
| `linkAccount`    | Привязка OAuth к anonymous | idToken, provider | success            |
| `unlinkAccount`  | Отвязка провайдера         | provider          | success            |

### 6.4 Хранение токенов (Flutter)

- `sessionToken` → flutter_secure_storage (encrypted)
- `userId` → flutter_secure_storage
- `isAnonymous` → shared_preferences
- Auto-refresh при 401 ошибке

### 6.5 Конфигурация

**Google Sign-In:**

- iOS: GoogleService-Info.plist + URL Schemes
- Android: google-services.json + SHA-1 fingerprint

**Sign in with Apple:**

- iOS: Capability "Sign in with Apple" в Xcode
- Android: через веб-редирект (Apple не поддерживает нативно)

### 6.6 Logout Flow

1. Удаляем sessionToken из secure storage
2. Очищаем локальную БД (опционально, спросить пользователя)
3. Вызываем Parse logout (инвалидирует сессию на сервере)
4. Редирект на AuthScreen

---

## 7. Бизнес-логика **[MVP]**

### 7.1 Подписки (RevenueCat)

| **План**      | **Цена**   | **Лимиты**                                 |
| ------------- | ---------- | ------------------------------------------ |
| Free          | $0         | 3 заметки всего                            |
| Plus (Weekly) | $6.99/нед  | Безлимит заметок, 100 мин транскрипции/мес |
| Pro (Yearly)  | $49.99/год | Безлимит всего                             |

**Entitlements:** `plus`, `pro`

### 6.2 Источники заметок

| **Тип**      | **Flow**                                             |
| ------------ | ---------------------------------------------------- |
| Record Audio | Запись → Upload → Transcribe → Summary → Insights    |
| YouTube Link | Parse URL → Extract subtitles → Summary → Insights   |
| Upload Audio | Pick file → Upload → Transcribe → Summary → Insights |
| Scan Text    | Camera/Gallery → OCR → Summary → Insights            |

### 6.3 Offline Mode

**MVP:**

- Все заметки хранятся только локально (Drift/SQLite)
- Запись аудио работает полностью offline
- Интернет нужен только для AI-обработки (транскрипция, саммари, insights)
- Никакой облачной синхронизации

**Итерация 2:**

- При авторизации добавляется облачная синхронизация через Parse Server
- Offline-first подход сохраняется
- При появлении сети — автоматическая синхронизация
- Флаг `needsSync` для отслеживания несинхронизированных записей

### 6.4 Deep Links

| **Link**                         | **Действие**           |
| -------------------------------- | ---------------------- |
| `biblenote://note/:id`           | Открыть заметку        |
| `biblenote://shared/:token`      | Открыть shared заметку |
| `https://biblenote.app/note/:id` | Universal link         |

---

## 8. UI/UX требования

### 8.1 Дизайн-система

**Стиль:** Warm Modern Minimalism — premium, cozy, friendly эстетика. Никаких градиентов, резких контрастов или острых углов.

**Темы:** Приложение ОБЯЗАТЕЛЬНО поддерживает Light и Dark режимы. Тема определяется системными настройками устройства с возможностью ручного переключения в Settings.

#### Цветовая схема

**Фоны и поверхности:**

| **Элемент**        | **Light Mode**   | **Dark Mode**       |
| ------------------ | ---------------- | ------------------- |
| Background         | \#F5F0E6 (Cream) | \#1A1A1A (Charcoal) |
| Surface (карточки) | \#FFFFFF         | \#242424            |
| Surface Elevated   | \#FFFFFF         | \#2D2D2D            |
| Overlay            | rgba(0,0,0,0.4)  | rgba(0,0,0,0.6)     |

**Акцентные цвета (одинаковые для обеих тем):**

| **Название** | **HEX**  | **Использование**                               |
| ------------ | -------- | ----------------------------------------------- |
| Warm Orange  | \#E8734A | Primary CTA, активные элементы, FAB в dark mode |
| Soft Yellow  | \#F2C94C | Хайлайтер текста, badges, выделение             |
| Sage Green   | \#7D9E82 | Успех, подтверждения, теги категорий            |
| Dusty Blue   | \#6B8CAE | Ссылки, информационные элементы                 |

**Текст:**

| **Контекст** | **Light Mode** | **Dark Mode** |
| ------------ | -------------- | ------------- |
| Primary      | \#1A1A1A       | \#F5F0E6      |
| Secondary    | \#5C5C5C       | \#A3A3A3      |
| Tertiary     | \#8C8C8C       | \#6B6B6B      |
| On Accent    | \#FFFFFF       | \#FFFFFF      |

**Границы и разделители:**

| **Элемент** | **Light Mode**   | **Dark Mode**          |
| ----------- | ---------------- | ---------------------- |
| Border      | \#E5E0D8         | \#3D3D3D               |
| Divider     | rgba(0,0,0,0.06) | rgba(255,255,255,0.08) |

**Статусы:**

| **Статус** | **Цвет**              |
| ---------- | --------------------- |
| Success    | \#7D9E82 (Sage Green) |
| Error      | \#D64545              |
| Warning    | \#E8A54A              |
| Info       | \#6B8CAE (Dusty Blue) |

#### Формы и радиусы

- **Карточки:** border-radius 20px, solid color fill, **без теней**
- **Кнопки Primary:** border-radius 24px (pill-shaped)
- **Чипы и теги:** border-radius 16px (pill-shaped)
- **Поля ввода:** border-radius 12px
- **Аватары:** круглые (50% radius)

#### Иконки

- **Стиль:** Outlined с закруглёнными концами
- **Толщина обводки:** 2px
- **Цвет:** Соответствует цвету текста в контексте

#### Специальные элементы

**FAB (Floating Action Button):**

| **Режим**  | **Фон**                | **Иконка** |
| ---------- | ---------------------- | ---------- |
| Light Mode | \#1A1A1A (Charcoal)    | \#FFFFFF   |
| Dark Mode  | \#E8734A (Warm Orange) | \#FFFFFF   |

**Другие элементы:**

- **Хайлайтер текста:** Soft Yellow (#F2C94C) с opacity 0.4
- **Selection:** Soft Yellow background
- **Focus ring:** Dusty Blue (#6B8CAE)
- **Skeleton loading:** Пульсирующий gradient между Surface и Surface Elevated

#### Принципы

- Никаких градиентов
- Никаких резких контрастов
- Никаких острых углов
- Solid color fills для карточек
- Минимализм с теплотой

### 8.2 Типографика

**Шрифты:** `assets/fonts/recoleta/` и `assets/fonts/tt_norms_pro/`

**Recoleta** — характерный тёплый шрифт с засечками:

- Заголовки (Display, H1, H2, H3)
- Primary кнопки (CTA)
- Названия заметок
- Цитаты в Insight-карточках
- Цены, таймеры, числа в статистике

**TT Norms Pro** — нейтральный гротеск:

- Body текст (транскрипты, AI Summary)
- Навигация и табы
- Мета-информация (даты, длительность)
- Поля ввода
- Secondary кнопки
- Диалоги и alerts

**Размеры:**

| **Элемент** | **Шрифт**            | **Размер** |
| ----------- | -------------------- | ---------- |
| Display     | Recoleta Bold        | 32-40px    |
| H1          | Recoleta SemiBold    | 28px       |
| H2          | Recoleta Medium      | 22px       |
| H3          | Recoleta Medium      | 18px       |
| Body        | TT Norms Pro Regular | 14-16px    |
| Caption     | TT Norms Pro Medium  | 12px       |

### 8.3 Компоненты

- `AppButton` — primary (pill), secondary, text variants
- `AppTextField` — с label, error state
- `AppCard` — базовая карточка (20px radius, solid fill, без теней)
- `NoteCard` — карточка заметки в списке
- `AudioPlayer` — мини-плеер с прогрессом
- `LoadingOverlay` — индикатор загрузки
- `EmptyState` — пустое состояние с иллюстрацией
- `BottomSheetContainer` — базовый bottom sheet
- `ChipSelector` — выбор табов (AI Summary, Transcript, etc.)

### 8.4 Анимации

- Hero-анимация при переходе к заметке
- Shimmer для loading states
- Fade transitions между табами
- Slide-up для bottom sheets

---

## 9. Локализация

Файлы в `lib/l10n/`:

- `intl_en.arb` (English — default)
- `intl_ru.arb` (Русский)
- `intl_es.arb` (Español)
- `intl_uk.arb` (Українська)
- `intl_pt.arb` (Português)

Ключевые строки для перевода:

- Навигация и заголовки
- Кнопки и действия
- Сообщения об ошибках
- Onboarding тексты
- Subscription описания

---

## 10. Виджеты (Native) **[ИТЕРАЦИЯ 2]**

### Важно

Виджеты реализуются **нативно** — Swift/SwiftUI для iOS, Kotlin для Android. Flutter используется только для основного приложения.

### iOS Widgets (WidgetKit + SwiftUI)

| **Виджет**          | **Размеры**   | **Описание**                                                          |
| ------------------- | ------------- | --------------------------------------------------------------------- |
| VerseOfTheDayWidget | Small, Medium | Случайный стих из Библии, обновляется автоматически в 00:00 ежедневно |
| LastNoteWidget      | Medium, Large | Превью последней заметки с кнопкой открытия                           |

**Реализация:**

- App Groups для shared данных между Flutter и Widget Extension
- UserDefaults (suite name) для передачи данных
- Timeline Provider для автоматического ежедневного обновления стиха (00:00 по местному времени)
- Deep link при тапе: VerseOfTheDayWidget → Bible Tab, LastNoteWidget → конкретная заметка

### Android Widgets (Glance + Jetpack Compose)

| **Виджет**          | **Размеры** | **Описание**                                                          |
| ------------------- | ----------- | --------------------------------------------------------------------- |
| VerseOfTheDayWidget | 2x2, 4x2    | Случайный стих из Библии, обновляется автоматически в 00:00 ежедневно |
| LastNoteWidget      | 4x2, 4x4    | Превью последней заметки с кнопкой открытия                           |

**Реализация:**

- SharedPreferences для передачи данных из Flutter
- GlanceAppWidget для UI
- WorkManager для автоматического ежедневного обновления стиха (00:00 по местному времени)
- PendingIntent с deep link для навигации

### Структура нативного кода

```other
ios/
├── BibleNote/
│ └── AppDelegate.swift
├── BibleNoteWidget/
│ ├── BibleNoteWidget.swift
│ ├── VerseOfTheDayWidget.swift
│ ├── LastNoteWidget.swift
│ ├── WidgetDataProvider.swift
│ └── Assets.xcassets/
  
android/
├── app/src/main/
│ ├── kotlin/com/biblenote/
│ │ ├── MainActivity.kt
│ │ └── widgets/
│ │ ├── VerseOfTheDayWidget.kt
│ │ ├── LastNoteWidget.kt
│ │ └── WidgetDataProvider.kt
│ └── res/
│ └── xml/
│ ├── verse_of_day_widget_info.xml
│ └── last_note_widget_info.xml
```

### Обновление данных виджетов

**VerseOfTheDayWidget:**

- Работает автономно от Flutter
- Случайный стих выбирается из локальной SQLite БД Библии
- Обновление автоматическое в 00:00 по местному времени
- Timeline Provider (iOS) / WorkManager (Android) планирует ежедневные обновления

**LastNoteWidget:**

Flutter → Native через Method Channel:

- При создании/обновлении заметки вызывается Method Channel
- Данные сохраняются в shared storage (App Groups / SharedPreferences)
- Триггерится обновление виджета

```other
MethodChannel: 'com.biblenote/widgets'
Methods:
- updateNoteWidget(noteTitle, notePreview)
- refreshWidgets()
```

---

## 10.1 Интеграция Библии **[ИТЕРАЦИЯ 2]**

**Вдохновение:** Функционал вдохновлён приложением [Bible Notes](https://apps.apple.com/us/app/bible-notes/id6453161701) из App Store.

### Основные компоненты:

**1. Bible Tab** — отдельная вкладка в Bottom Navigation

- Чтение Библии: навигация Книга → Глава → Стих
- Поиск по тексту
- Кастомизация: шрифт, размер, цвет фона, подсветка
- Один перевод на язык (5 переводов: RU, EN, ES, UK, PT)

**2. Автодополнение стихов** в NoteEditorScreen

- Распознавание: "Иоанн 3:16", "Мф 5:3-12", "Псалом 23"
- Tooltip с предложением вставить полный текст стиха

**3. Popup стихов** в NoteDetailScreen

- Тапабельные ссылки на стихи
- Bottom Sheet с текстом и кнопками: "Открыть в Библии", "Копировать"

### Технические детали:

- **Хранение:** SQLite БД (~20-30 MB для 5 переводов), встроенная в приложение
- **Offline-first:** Все тексты доступны без интернета
- **Feature:** `bible` (data/domain/presentation layers)
- **Экраны:** BibleReaderScreen, BibleSearchScreen, VersePopupBottomSheet

---

## 11. Push-уведомления **[MVP]**

| **Триггер**                 | **Сообщение**                             |
| --------------------------- | ----------------------------------------- |
| Транскрипция готова         | "Ваша заметка готова к просмотру"         |
| Напоминание (если включено) | "Время для записи новых идей"             |
| Subscription expires        | "Ваша подписка заканчивается через 3 дня" |

**Технические детали:**

- Firebase Cloud Messaging
- iOS: push certificates настроены
- Android: FCM token регистрация
- Локальные уведомления для напоминаний

---

## 12. Аналитика (Firebase)

### События

- `sign_up` — регистрация (method: google/apple/anonymous) *(Итерация 2)*
- `login` — вход *(Итерация 2)*
- `note_created` — создание заметки (source_type)
- `note_viewed` — просмотр заметки
- `transcription_completed` — транскрипция завершена
- `insight_shared` — шеринг Insight-карточки
- `subscription_started` — оформление подписки (plan)
- `subscription_cancelled` — отмена подписки
- `paywall_viewed` — просмотр paywall

### User Properties

- `subscription_status` — free/plus/pro
- `notes_count` — количество заметок
- `preferred_language` — язык приложения

---

## 13. Структура папок проекта

```other
lib/
├── main.dart
├── app.dart
├── injection.dart
├── core/
│ ├── constants/
│ │ ├── app_constants.dart
│ │ └── api_constants.dart
│ ├── errors/
│ │ ├── failures.dart
│ │ └── exceptions.dart
│ ├── network/
│ │ ├── dio_client.dart
│ │ └── network_info.dart
│ ├── router/
│ │ └── app_router.dart
│ ├── theme/
│ │ ├── app_theme.dart
│ │ ├── app_colors.dart
│ │ └── app_typography.dart
│ └── utils/
│ ├── date_utils.dart
│ └── validators.dart
├── features/
│ ├── auth/
│ ├── notes/
│ ├── recording/
│ ├── transcription/
│ ├── ai_chat/
│ ├── folders/
│ ├── insights/
│ ├── settings/
│ └── subscription/
├── shared/
│ ├── widgets/
│ │ ├── app_button.dart
│ │ ├── app_text_field.dart
│ │ ├── app_card.dart
│ │ ├── audio_player.dart
│ │ ├── loading_overlay.dart
│ │ └── empty_state.dart
│ └── extensions/
│ ├── context_extensions.dart
│ └── string_extensions.dart
└── l10n/
├── intl_en.arb
├── intl_ru.arb
├── intl_es.arb
├── intl_uk.arb
└── intl_pt.arb
  
assets/
├── fonts/
│ ├── recoleta/
│ │ ├── Recoleta-Thin.ttf
│ │ ├── Recoleta-Light.ttf
│ │ ├── Recoleta-Regular.ttf
│ │ ├── Recoleta-Medium.ttf
│ │ ├── Recoleta-SemiBold.ttf
│ │ ├── Recoleta-Bold.ttf
│ │ └── Recoleta-Black.ttf
│ └── tt_norms_pro/
│ ├── TTNormsPro-Regular.ttf
│ ├── TTNormsPro-Medium.ttf
│ ├── TTNormsPro-DemiBold.ttf
│ ├── TTNormsPro-Bold.ttf
│ ├── TTNormsPro-Italic.ttf
│ └── TTNormsPro-MediumItalic.ttf
├── images/
│ ├── logo.png
│ ├── onboarding/
│ └── empty_states/
└── icons/
```

---

## 14. Зависимости pubspec.yaml

```yaml
dependencies:
flutter:
sdk: flutter
flutter_localizations:
sdk: flutter
# State Management
flutter_bloc: ^8.1.0
equatable: ^2.0.5
# Routing
go_router: ^14.0.0
# Network
dio: ^5.4.0
connectivity_plus: ^6.0.0
# Code Generation
freezed_annotation: ^2.4.0
json_annotation: ^4.8.0
# DI
get_it: ^7.6.0
injectable: ^2.3.0
# Local Storage
drift: ^2.15.0
sqlite3_flutter_libs: ^0.5.0
shared_preferences: ^2.2.0
flutter_secure_storage: ^9.0.0
# Auth
google_sign_in: ^6.2.0
sign_in_with_apple: ^6.1.0
# Firebase
firebase_core: ^2.25.0
firebase_messaging: ^14.7.0
firebase_analytics: ^10.8.0
firebase_dynamic_links: ^5.4.0
# Payments
purchases_flutter: ^6.0.0
# Audio
record: ^5.0.0
just_audio: ^0.9.36
audio_waveforms: ^1.0.5
# Media
image_picker: ^1.0.0
file_picker: ^6.1.0
# Utils
share_plus: ^7.2.0
permission_handler: ^11.3.0
path_provider: ^2.1.0
uuid: ^4.3.0
intl: ^0.19.0
url_launcher: ^6.2.0
cached_network_image: ^3.3.0
shimmer: ^3.0.0
  
dev_dependencies:
flutter_test:
sdk: flutter
build_runner: ^2.4.0
freezed: ^2.4.0
json_serializable: ^6.7.0
injectable_generator: ^2.4.0
drift_dev: ^2.15.0
flutter_lints: ^3.0.0
  
flutter:
uses-material-design: true
assets:
- assets/images/
- assets/images/onboarding/
- assets/images/empty_states/
- assets/icons/
fonts:
- family: Recoleta
fonts:
- asset: assets/fonts/recoleta/Recoleta-Thin.ttf
weight: 100
- asset: assets/fonts/recoleta/Recoleta-Light.ttf
weight: 300
- asset: assets/fonts/recoleta/Recoleta-Regular.ttf
weight: 400
- asset: assets/fonts/recoleta/Recoleta-Medium.ttf
weight: 500
- asset: assets/fonts/recoleta/Recoleta-SemiBold.ttf
weight: 600
- asset: assets/fonts/recoleta/Recoleta-Bold.ttf
weight: 700
- asset: assets/fonts/recoleta/Recoleta-Black.ttf
weight: 900
- family: TTNormsPro
fonts:
- asset: assets/fonts/tt_norms_pro/TTNormsPro-Regular.ttf
weight: 400
- asset: assets/fonts/tt_norms_pro/TTNormsPro-Italic.ttf
weight: 400
style: italic
- asset: assets/fonts/tt_norms_pro/TTNormsPro-Medium.ttf
weight: 500
- asset: assets/fonts/tt_norms_pro/TTNormsPro-MediumItalic.ttf
weight: 500
style: italic
- asset: assets/fonts/tt_norms_pro/TTNormsPro-DemiBold.ttf
weight: 600
- asset: assets/fonts/tt_norms_pro/TTNormsPro-Bold.ttf
weight: 700
```

---

## 15. Критерии готовности

### 15.1 MVP (Первый релиз) — Готов к запуску когда:

**Основной функционал:**

- [ ] Создание заметки через запись аудио
- [ ] Создание заметки через YouTube link
- [ ] Создание заметки через загрузку аудио
- [ ] Создание заметки через сканирование текста (OCR)
- [ ] AI-транскрипция аудио
- [ ] AI-саммари (генерация AI Summary)
- [ ] Генерация Insight-карточек

**Организация и хранение:**

- [ ] Локальное хранилище (SQLite через Drift)
- [ ] Папки для организации заметок
- [ ] Создание/редактирование/удаление папок
- [ ] Offline режим (все работает без интернета)

**Шеринг и экспорт:**

- [ ] Создание shared links для заметок (с токенами)
- [ ] Просмотр shared заметок без авторизации
- [ ] Экспорт Insight-карточек как изображений для соцсетей
- [ ] Базовый экспорт заметок (текст/PDF)

**UI/UX:**

- [ ] Дизайн-система Warm Modern Minimalism
- [ ] Light и Dark режимы (автоматическое переключение + ручное)
- [ ] Все основные экраны реализованы:
- [ ] NotesListScreen (список заметок)
- [ ] RecordingScreen (запись аудио)
- [ ] NoteDetailScreen (просмотр заметки с табами)
- [ ] NoteEditorScreen (редактирование My Notes)
- [ ] InsightViewerScreen (просмотр Insight-карточек)
- [ ] FoldersScreen (список папок)
- [ ] SettingsScreen (базовые настройки)
- [ ] SubscriptionScreen (paywall с планами)

**Локализация:**

- [ ] Полная локализация на 5 языков (Русский, Английский, Испанский, Украинский, Португальский)
- [ ] Все UI-строки переведены
- [ ] Правильное отображение дат и времени для каждого языка

**Backend:**

- [ ] Parse Server настроен и работает
- [ ] Cloud Functions для AI (транскрипция, саммари, insights) работают
- [ ] Парсинг YouTube субтитров
- [ ] OCR для сканированного текста
- [ ] Создание shared links (createShareLink, getSharedNote)

**Push-уведомления:**

- [ ] Firebase Cloud Messaging настроен
- [ ] Push при готовности транскрипции
- [ ] Push-напоминания (опционально)
- [ ] Push об истечении подписки

**Подписки и монетизация:**

- [ ] RevenueCat интегрирован
- [ ] Три плана подписки (Free, Plus, Pro)
- [ ] Paywall экран реализован
- [ ] Проверка entitlements работает
- [ ] Лимиты для Free плана (3 заметки)

**Критические баги:**

- [ ] Нет критических багов, блокирующих основной flow
- [ ] Приложение не крашится при основных сценариях использования
- [ ] Запись аудио работает стабильно на iOS и Android

---

### 15.2 Вторая итерация — Готова к запуску когда:

**Авторизация и аккаунты:**

- [ ] OAuth авторизация через Google Sign-In
- [ ] OAuth авторизация через Apple Sign-In
- [ ] Anonymous вход (гостевой режим)
- [ ] Привязка/отвязка OAuth провайдеров
- [ ] Удаление аккаунта
- [ ] Миграция данных из локального хранилища в облако при первом входе

**Облачная синхронизация:**

- [ ] Синхронизация заметок между устройствами
- [ ] Синхронизация папок
- [ ] Offline-first с автоматической синхронизацией при появлении сети
- [ ] Разрешение конфликтов при синхронизации

**Интеграция Библии:**

- [ ] Отдельная вкладка Bible в Bottom Navigation
- [ ] Чтение Библии (5 переводов, по одному на язык)
- [ ] Навигация по книгам/главам/стихам
- [ ] Поиск по тексту Библии
- [ ] Автодополнение стихов в заметках (например, "Иоанн 3:16" → полный текст)
- [ ] Всплывающие стихи (popup) при клике на ссылку в заметках
- [ ] Кастомизация чтения Библии (шрифт, размер, цвет)
- [ ] Локальная база данных с текстами Библии (SQLite)

**Виджеты (нативные):**

- [ ] iOS виджеты (SwiftUI):
- [ ] VerseOfTheDayWidget (Small, Medium) — случайный стих, автообновление ежедневно в 00:00
- [ ] LastNoteWidget (Medium, Large) — превью последней заметки
- [ ] Timeline Provider для автоматического обновления стихов
- [ ] App Groups для shared данных между Flutter и Widget Extension
- [ ] Deep link при тапе на виджет
- [ ] Android виджеты (Jetpack Compose):
- [ ] VerseOfTheDayWidget (2x2, 4x2) — случайный стих, автообновление ежедневно в 00:00
- [ ] LastNoteWidget (4x2, 4x4) — превью последней заметки
- [ ] WorkManager для автоматического обновления стихов
- [ ] SharedPreferences для передачи данных из Flutter
- [ ] PendingIntent с deep link для навигации

**Дополнительные экраны:**

- [ ] AuthScreen (авторизация)
- [ ] AccountScreen (управление аккаунтом)
- [ ] BibleReaderScreen (чтение Библии)
- [ ] BibleSearchScreen (поиск по Библии)
- [ ] WidgetsPromoScreen (промо виджетов)

**Качество и стабильность:**

- [ ] Все критические баги исправлены
- [ ] Синхронизация работает корректно в различных сценариях
- [ ] Виджеты обновляются правильно
- [ ] Авторизация и миграция данных работают без потерь
- [ ] Библия загружается и работает офлайн
- [ ] Автодополнение стихов работает корректно на всех языках