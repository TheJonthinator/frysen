# Supabase Setup för Frysen

## 🏠 För Familjevärd (Teknisk Setup)

**Endast DU behöver göra detta - familjemedlemmar behöver inte detta!**

### 1. Skapa Supabase-konto

1. Gå till [supabase.com](https://supabase.com)
2. Skapa ett gratis konto
3. Skapa ett nytt projekt

### 2. Hämta API-nycklar

1. Gå till Project Settings → API
2. Kopiera:
   - **Project ID** (t.ex. `abc123def456`)
   - **anon public** key (för klient-appar)

### 3. Lägg till miljövariabler

Lägg till i din `.env` fil:

```env
VITE_SUPABASE_PROJECT_ID=din-project-id
VITE_SUPABASE_API_KEY=din-anon-public-key
```

**Notera:** Vi använder bara Supabase nu - inga Google Drive-nycklar behövs!

### 4. Skapa databastabeller

Kör följande SQL i Supabase SQL Editor:

```sql
-- Tabell för familjer
CREATE TABLE frysen_families (
  family_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabell för synkroniserad data
CREATE TABLE frysen_data (
  family_id TEXT PRIMARY KEY REFERENCES frysen_families(family_id),
  drawers JSONB DEFAULT '{}',
  shopping_list JSONB DEFAULT '[]',
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  version TEXT DEFAULT '1.0.0'
);

-- RLS (Row Level Security) - tillåt alla operationer för nu
ALTER TABLE frysen_families ENABLE ROW LEVEL SECURITY;
ALTER TABLE frysen_data ENABLE ROW LEVEL SECURITY;

-- Skapa policy som tillåter alla operationer
CREATE POLICY "Allow all operations" ON frysen_families FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON frysen_data FOR ALL USING (true);
```

### 5. Skapa din familj

1. Starta appen
2. Gå till "Synkronisering" fliken
3. Klicka "Skapa ny familj"
4. Ange familjenamn (t.ex. "Vår Familj")
5. **Kopiera familj-ID:t** som visas - du behöver dela detta med familjemedlemmar!

---

## 👥 För Familjemedlemmar (Enkel Setup)

**Din fru/fiancée behöver bara detta - inget tekniskt!**

### 1. Öppna appen

- Starta Frysen-appen på din enhet

### 2. Anslut till familjen

1. Gå till "Synkronisering" fliken
2. Klicka "Anslut till familj"
3. Ange familj-ID:t som du fick från familjevärden
4. Klicka "Anslut"

### 3. Börja synkronisera

- Allt synkroniseras automatiskt!
- Använd "Läs från molnet" om du vill hämta senaste data manuellt
- Data synkroniseras automatiskt mellan alla familjemedlemmar!

---

## 📱 Dela Familj-ID

**Som familjevärd, dela detta med dina familjemedlemmar:**

```
Familj-ID: family_1234567890_abc123def
```

**Sätt att dela:**

- **SMS/WhatsApp** - Skicka familj-ID:t
- **Email** - Skicka instruktioner + ID
- **Skriv upp** - Lämna en lapp med ID:t

---

## ❓ Vanliga Frågor

**För Familjemedlemmar:**

- **"Vad är ett familj-ID?"** - En kod som kopplar dig till familjens data
- **"Behöver jag skapa något konto?"** - Nej, inget konto behövs!
- **"Vad händer om jag förlorar ID:t?"** - Be familjevärden om det igen

**För Familjevärd:**

- **"Kan jag ändra familj-ID:t?"** - Nej, men du kan skapa en ny familj
- **"Hur många kan ansluta?"** - Obegränsat antal familjemedlemmar
- **"Är det säkert?"** - Ja, data är privat för din familj

---

## 🎯 Snabbstart för Familjemedlemmar

**Din fru/fiancée behöver bara:**

1. Öppna appen
2. Gå till "Synkronisering"
3. Ange familj-ID:t du ger henne
4. Börja använda appen!

**Inget mer! Inga konton, inga databaser, inget tekniskt.** 🎉

---

## 🔍 Kontrollera Databasen i Supabase

**För att se om synkroniseringen fungerar:**

### 1. Öppna Supabase Dashboard

1. Gå till [supabase.com](https://supabase.com)
2. Logga in och öppna ditt projekt

### 2. Kolla Tabellerna

1. Gå till **"Table Editor"** i sidomenyn
2. Du bör se två tabeller:
   - `frysen_families` - Dina familjer
   - `frysen_data` - Synkroniserad data

### 3. Kolla Familj-tabellen

1. Klicka på `frysen_families`
2. Du bör se din familj med:
   - `family_id` - Ditt familj-ID
   - `name` - Familjens namn
   - `created_at` - När den skapades

### 4. Kolla Data-tabellen

1. Klicka på `frysen_data`
2. Du bör se en rad med:
   - `family_id` - Samma som ovan
   - `drawers` - JSON med dina lådor
   - `shopping_list` - JSON med inköpslista
   - `last_updated` - När data senast uppdaterades

### 5. Testa Live-sync

1. **Öppna appen på två enheter**
2. **Lägg till en vara** på en enhet
3. **Klicka "Skriv"** för att synka
4. **Kolla databasen** - `last_updated` bör ändras
5. **Kolla andra enheten** - Varan bör dyka upp automatiskt

### 6. SQL-frågor för Debugging

Kör i **SQL Editor**:

```sql
-- Se alla familjer
SELECT * FROM frysen_families;

-- Se all synkroniserad data
SELECT * FROM frysen_data;

-- Se senaste uppdateringar
SELECT family_id, last_updated, drawers, shopping_list
FROM frysen_data
ORDER BY last_updated DESC;

-- Se specifik familj
SELECT * FROM frysen_data
WHERE family_id = 'ditt-familj-id-här';
```

### 7. Real-time Logs

1. Gå till **"Logs"** i sidomenyn
2. Välj **"Realtime"**
3. Du bör se live-uppdateringar när data synkas

**Om du ser data i tabellerna och `last_updated` ändras när du synkar, fungerar allt!** 🎉
