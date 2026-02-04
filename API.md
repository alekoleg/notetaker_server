# NoteTaker Server API Documentation

Все функции вызываются через Parse Cloud Functions. Требуется авторизация (кроме `getSharedNote`).

---

## Схемы данных

### Note

| Поле | Тип | Описание |
|------|-----|----------|
| objectId | String | ID заметки |
| user | Pointer\<User\> | Владелец |
| title | String | Название |
| folder | Pointer\<Folder\>? | Папка (опционально) |
| sourceType | String | `recording` \| `youtube` \| `upload` \| `scan` |
| sourceUrl | String? | URL источника (для YouTube) |
| audioFileUrl | String? | URL аудиофайла в S3 |
| transcript | String? | Транскрипция |
| aiSummary | String? | AI-резюме |
| myNotes | String? | Заметки пользователя |
| insights | Array\<String\> | AI-инсайты |
| status | String | `processing` \| `ready` \| `error` |
| isDeleted | Boolean | Мягкое удаление |

### Folder

| Поле | Тип | Описание |
|------|-----|----------|
| objectId | String | ID папки |
| user | Pointer\<User\> | Владелец |
| name | String | Название |
| color | String? | Цвет (hex) |
| order | Number | Порядок сортировки |
| isDeleted | Boolean | Мягкое удаление |

---

## Cloud Functions

### Файлы

#### `uploadFile`

Загрузка файла в S3.

**Параметры:**
| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| fileBase64 | String | Да | Файл в base64 |
| filename | String | Нет | Имя файла (по умолчанию `file.bin`) |

**Ответ:**
```json
{
  "url": "https://...",
  "path": "users/abc123/..."
}
```

---

### Заметки

#### `createNote`

Создание новой заметки.

**Параметры:**
| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| title | String | Нет | Название (по умолчанию "Untitled Note") |
| sourceType | String | Да | `recording` \| `youtube` \| `upload` \| `scan` |
| sourceUrl | String | Нет | URL источника (для YouTube) |
| audioFileUrl | String | Нет | URL загруженного аудио |
| folderId | String | Нет | ID папки |

**Ответ:** Note object

**Типичный flow для записи:**
```swift
// 1. Загрузить аудио
let upload = Parse.Cloud.run("uploadFile", params: [
    "fileBase64": audioData.base64EncodedString(),
    "filename": "recording.m4a"
])

// 2. Создать заметку
let note = Parse.Cloud.run("createNote", params: [
    "title": "Meeting Notes",
    "sourceType": "recording",
    "audioFileUrl": upload.url
])

// 3. Запустить AI-обработку
Parse.Cloud.run("processNote", params: ["noteId": note.objectId])
```

---

#### `getNotes`

Получить список заметок пользователя.

**Параметры:**
| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| folderId | String | Нет | Фильтр по папке |
| limit | Number | Нет | Лимит (по умолчанию 50) |
| skip | Number | Нет | Пропустить N записей |

**Ответ:** `[Note, Note, ...]`

---

#### `updateNote`

Обновить заметку.

**Параметры:**
| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| noteId | String | Да | ID заметки |
| title | String | Нет | Новое название |
| myNotes | String | Нет | Заметки пользователя |
| folderId | String \| null | Нет | ID папки или null для удаления из папки |

**Ответ:** Note object

---

#### `deleteNote`

Мягкое удаление заметки.

**Параметры:**
| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| noteId | String | Да | ID заметки |

**Ответ:**
```json
{ "success": true }
```

---

### AI-обработка

#### `transcribeAudio`

Транскрибирование аудио заметки (ElevenLabs STT).

**Параметры:**
| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| noteId | String | Да | ID заметки с audioFileUrl |

**Ответ:**
```json
{ "transcript": "..." }
```

> **Важно:** Заметка должна иметь `audioFileUrl`. Автоматически обновляет поля `transcript` и `status` в Note.

---

#### `generateSummary`

Генерация AI-резюме (OpenAI).

**Параметры:**
| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| noteId | String | Да | ID заметки с transcript |

**Ответ:**
```json
{ "summary": "..." }
```

> **Важно:** Заметка должна иметь `transcript`. Автоматически обновляет поле `aiSummary` в Note.

---

#### `generateInsights`

Генерация ключевых инсайтов (OpenAI).

**Параметры:**
| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| noteId | String | Да | ID заметки с transcript |
| count | Number | Нет | Количество инсайтов (по умолчанию 5) |

**Ответ:**
```json
{ "insights": ["...", "...", "..."] }
```

---

#### `processNote`

Полная AI-обработка: транскрипция → резюме → инсайты.

**Параметры:**
| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| noteId | String | Да | ID заметки |

**Ответ:**
```json
{
  "transcript": "...",
  "summary": "...",
  "insights": ["...", "..."]
}
```

> **Рекомендуется:** Использовать эту функцию после создания заметки с аудио.

---

#### `processOCR`

Распознавание текста с изображения (Gemini Vision).

**Параметры:**
| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| imageBase64 | String | Да | Изображение в base64 |
| mimeType | String | Нет | MIME-тип (по умолчанию `image/jpeg`) |
| language | String | Нет | Язык текста (по умолчанию `en`) |

**Ответ:**
```json
{
  "text": "...",
  "language": "en"
}
```

---

#### `createNoteFromScan`

Создание заметки из скана: OCR → заметка → резюме + инсайты (в фоне).

**Параметры:**
| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| imageBase64 | String | Да | Изображение в base64 |
| mimeType | String | Нет | MIME-тип (по умолчанию `image/jpeg`) |
| language | String | Нет | Язык текста (по умолчанию `en`) |
| title | String | Нет | Название (по умолчанию "Scanned Note") |
| folderId | String | Нет | ID папки |

**Ответ:**
```json
{ "note": { ...Note } }
```

> Summary и insights генерируются в фоне автоматически.

---

#### `parseYouTube`

Получить транскрипцию и метаданные YouTube видео.

**Параметры:**
| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| url | String | Да | YouTube URL или video ID |
| lang | String | Нет | Язык субтитров (автоопределение если не указан) |

**Ответ:**
```json
{
  "transcript": "...",
  "title": "Video Title",
  "videoId": "dQw4w9WgXcQ",
  "language": "en",
  "authorName": "Channel Name",
  "thumbnailUrl": "https://i.ytimg.com/vi/..."
}
```

**Поддерживаемые форматы URL:**
- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://www.youtube.com/embed/VIDEO_ID`
- `https://www.youtube.com/shorts/VIDEO_ID`
- Просто `VIDEO_ID` (11 символов)

---

#### `createNoteFromYouTube`

Создание заметки из YouTube видео: парсинг → заметка → резюме + инсайты (в фоне).

**Параметры:**
| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| url | String | Да | YouTube URL или video ID |
| lang | String | Нет | Язык субтитров (автоопределение если не указан) |
| title | String | Нет | Название (по умолчанию берётся из YouTube) |
| folderId | String | Нет | ID папки |

**Ответ:**
```json
{
  "note": { ...Note },
  "youtubeMetadata": {
    "videoId": "dQw4w9WgXcQ",
    "authorName": "Channel Name",
    "thumbnailUrl": "https://i.ytimg.com/vi/..."
  }
}
```

> Summary и insights генерируются в фоне автоматически.

---

### Папки

#### `getFolders`

Получить все папки пользователя.

**Параметры:** нет

**Ответ:** `[Folder, Folder, ...]` (отсортировано по `order`)

---

#### `createFolder`

Создать папку.

**Параметры:**
| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| name | String | Да | Название |
| color | String | Нет | Цвет (hex) |
| order | Number | Нет | Порядок (по умолчанию 0) |

**Ответ:** Folder object

---

#### `updateFolder`

Обновить папку.

**Параметры:**
| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| folderId | String | Да | ID папки |
| name | String | Нет | Новое название |
| color | String | Нет | Новый цвет |
| order | Number | Нет | Новый порядок |

**Ответ:** Folder object

---

#### `deleteFolder`

Удалить папку (убирает связь со всеми заметками в ней).

**Параметры:**
| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| folderId | String | Да | ID папки |

**Ответ:**
```json
{ "success": true }
```

---

#### `reorderFolders`

Изменить порядок папок.

**Параметры:**
| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| folderOrders | Array | Да | Массив `[{ folderId, order }]` |

**Ответ:**
```json
{ "success": true }
```

---

### Шаринг

#### `createShareLink`

Создать публичную ссылку на заметку.

**Параметры:**
| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| noteId | String | Да | ID заметки |
| expiresInDays | Number | Нет | Срок действия в днях |

**Ответ:**
```json
{
  "shareToken": "abc123...",
  "shareUrl": "https://.../shared/abc123...",
  "expiresAt": "2026-02-01T00:00:00Z"
}
```

---

#### `getSharedNote`

Получить заметку по токену (публичный доступ).

> ⚠️ **Не требует авторизации**

**Параметры:**
| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| shareToken | String | Да | Токен из shareUrl |

**Ответ:**
```json
{
  "objectId": "...",
  "title": "...",
  "sourceType": "recording",
  "transcript": "...",
  "aiSummary": "...",
  "insights": ["...", "..."],
  "createdAt": "..."
}
```

---

#### `getShareLinkStatus`

Проверить статус шаринга заметки.

**Параметры:**
| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| noteId | String | Да | ID заметки |

**Ответ (если есть ссылка):**
```json
{
  "hasShareLink": true,
  "shareToken": "...",
  "shareUrl": "...",
  "expiresAt": "..."
}
```

**Ответ (если нет ссылки):**
```json
{ "hasShareLink": false }
```

---

#### `deleteShareLink`

Удалить публичную ссылку.

**Параметры:**
| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| noteId | String | Да | ID заметки |

**Ответ:**
```json
{ "success": true }
```

---

## Типичные сценарии

### Запись аудио → AI-обработка

```
1. uploadFile(audio) → url
2. createNote(title, sourceType: "recording", audioFileUrl: url) → note
3. processNote(noteId) → { transcript, summary, insights }
```

### YouTube видео → Заметка

```
1. createNoteFromYouTube(url: "https://youtube.com/watch?v=...") → note
   (summary + insights генерируются в фоне автоматически)
```

Или пошагово:
```
1. parseYouTube(url) → { transcript, title, videoId }
2. createNote(title, sourceType: "youtube", sourceUrl: url) → note
3. updateNote(noteId, transcript) или вручную установить transcript
4. generateSummary(noteId) → { summary }
5. generateInsights(noteId) → { insights }
```

### Сканирование документа

```
1. createNoteFromScan(imageBase64) → note
   (summary + insights генерируются в фоне автоматически)
```

### Поделиться заметкой

```
1. createShareLink(noteId, expiresInDays: 7) → shareUrl
2. Пользователь открывает shareUrl
3. getSharedNote(shareToken) → данные заметки
```
