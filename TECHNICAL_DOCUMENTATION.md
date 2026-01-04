# Teknik Dokümantasyon: BetWise Pro

## 1. Projenin Amacı

BetWise Pro, harici bir futbol veri API'sinden alınan maç verilerini kullanarak istatistiksel ve yapay zeka tabanlı tahminler üreten bir web uygulamasıdır. Kullanıcıların yaklaşan maçları görmesine, maçlar için üretilen tahminleri ve analizleri incelemesine olanak tanır. Uygulama, veri yönetimi, tahmin analizi ve portföy takibi gibi özellikler sunar.

---

## 2. Sistem Mimarisi ve Teknolojiler

Uygulama, modern bir web mimarisi olan **Next.js App Router** üzerine kurulmuştur. Bu mimari, sunucu ve istemci bileşenlerinin (Server & Client Components) bir arada kullanılmasına olanak tanıyarak performansı ve geliştirici deneyimini optimize eder.

### Ana Teknolojiler:

*   **Framework:** Next.js 15 (App Router)
*   **Dil:** TypeScript
*   **Veritabanı:** SQLite
*   **ORM (Veritabanı Yönetimi):** Drizzle ORM
*   **Arayüz (UI):** React, ShadCN UI, Tailwind CSS
*   **Analiz ve Tahmin Motoru:** Python (Hybrid Model) ve Genkit (AI Yorumlama)
*   **Backend Logic:** Next.js Server Actions ve API Routes

### Mimarinin Temel Bileşenleri:

1.  **Frontend (İstemci Tarafı):**
    *   Kullanıcı arayüzü, **React** bileşenleri ile oluşturulmuştur.
    *   Stil ve tasarım için **Tailwind CSS** ve hazır, özelleştirilebilir bileşenler sunan **ShadCN UI** kütüphanesi kullanılır. Tema ayarları `src/app/globals.css` ve `tailwind.config.ts` dosyalarında yapılandırılmıştır.
    *   Dinamik ve kullanıcı etkileşimine dayalı bileşenler (örn: filtreleme, buton tıklamaları) `'use client';` direktifi ile İstemci Bileşeni olarak çalışır.

2.  **Backend (Sunucu Tarafı):**
    *   **Veri Mutasyonları:** Veritabanına veri yazma, güncelleme gibi işlemler **Next.js Server Actions** (`src/app/actions.ts`) üzerinden güvenli bir şekilde gerçekleştirilir. Bu, ayrı bir backend sunucusuna olan ihtiyacı ortadan kaldırır.
    *   **API Rotaları:** Dış servislerle (örn: `football-data.org`) iletişim kurmak veya özel backend mantığı çalıştırmak için **API Routes** (`src/app/api/`) kullanılır. Örneğin, maç verilerinin çekildiği `ingest` rotası ve tahminlerin yapıldığı `ai-predict` rotası burada yer alır.
    *   Sayfaların büyük bir kısmı, veriyi doğrudan sunucuda çeken ve HTML'yi hazır olarak istemciye gönderen **Sunucu Bileşenleri (Server Components)** olarak çalışır. Bu, sayfa yükleme hızını artırır.

3.  **Veritabanı Katmanı:**
    *   Uygulama, sunucu üzerinde bir dosya olarak çalışan **SQLite** veritabanını kullanır. Veritabanı dosyası `bahis.db`'dir.
    *   **Drizzle ORM**, TypeScript ile veritabanı şemasını (`src/db/schema.ts`) tanımlamayı ve sorguları güvenli bir şekilde yapmayı sağlar.
    *   `src/db/index.ts` dosyası, veritabanı bağlantısını kurar ve uygulama her başladığında şemanın güncel olup olmadığını kontrol ederek gerekirse tabloları yeniden oluşturan "kendi kendini onaran" bir mantık içerir.

4.  **Analiz ve AI Katmanı:**
    *   **Matematiksel Tahmin:** `analysis.py` script'i, maçlar için istatistiksel tahminler üretir. Bu script, Poisson dağılımı, takım form durumu, oranlar ve sakatlık verilerini bir araya getiren hibrit bir model kullanır. `api/ai-predict/route.ts` rotası, bu Python script'ini bir alt işlem (child process) olarak çalıştırır ve sonuçlarını alır.
    *   **AI Yorumlama:** `src/ai/flows/` altındaki **Genkit** flow'ları, üretilen matematiksel tahminleri alıp bunlar hakkında doğal dilde (Türkçe) yorumlar ve açıklamalar üretir. Bu, kullanıcıya sadece sayısal veri değil, aynı zamanda anlaşılır bir analiz sunar.

---

## 3. Veri Akışı (Data Flow)

Uygulamanın temel veri akışı şu şekildedir:

1.  **Veri Çekme (Ingestion):**
    *   Kullanıcı, arayüzdeki "Fikstürü Yenile ve Analiz Et" butonuna tıklar.
    *   Bu, `refreshAndAnalyzeMatches` adlı Server Action'ı tetikler.
    *   Action, `lib/api-football.ts` içerisindeki `fetchFixtures` fonksiyonunu kullanarak `football-data.org` API'sinden belirlenen liglerin (`PL`, `PD`, vb.) ve sezonların (`2024`, `2023`) maç verilerini çeker.
    *   Çekilen ham veri, `mapAndUpsertFixtures` fonksiyonu ile işlenir ve Drizzle ORM aracılığıyla SQLite veritabanındaki `leagues`, `teams`, ve `matches` tablolarına yazılır.

2.  **Analiz ve Tahmin Üretme:**
    *   Veri çekme işlemi tamamlandıktan hemen sonra, `analyzeMatches` fonksiyonu çağrılır.
    *   Bu fonksiyon, veritabanında `confidence` değeri `NULL` olan, yani henüz analiz edilmemiş maçları bulur.
    *   Her bir maç için `api/ai-predict/route.ts` rotası üzerinden `analysis.py` script'i tetiklenir.
    *   Python script'i, maçın olasılıklarını (`home_win_prob`, `draw_prob`, `away_win_prob`), güven skorunu (`confidence`) ve tahmini skoru (`predicted_score`) hesaplar.
    *   Bu analiz sonuçları, ilgili maçın satırını veritabanında günceller.

3.  **Veri Gösterimi:**
    *   Kullanıcı "Maç Merkezi" gibi bir sayfayı ziyaret ettiğinde, sayfanın sunucu bileşeni `getMatchesWithTeams` action'ını çağırır.
    *   Bu fonksiyon, Drizzle aracılığıyla veritabanındaki tüm maçları ve ilişkili takım bilgilerini çeker.
    *   Çekilen veriler, `MatchList` gibi istemci bileşenlerine `props` olarak aktarılır ve arayüzde listelenir.

---

## 4. Proje Dosya Yapısı ve Açıklamaları

*   `/src/app/(app)/`: Ana uygulama sayfalarının (Dashboard, Maç Merkezi, vb.) bulunduğu ana yönlendirme (routing) grubudur. `layout.tsx` dosyası bu sayfaların ortak kenar çubuğunu (sidebar) içerir.
*   `/src/app/api/`: Backend mantığını ve dış API çağrılarını yöneten API rotalarını içerir.
*   `/src/components/`: Arayüzü oluşturan React bileşenleridir. `ui` (ShadCN'in temel bileşenleri), `layout`, `dashboard` gibi alt klasörlere ayrılmıştır.
*   `/src/lib/`: Yardımcı fonksiyonlar (`utils.ts`), API iletişim mantığı (`api-football.ts`) ve veri tipleri (`types.ts`) gibi genel modülleri barındırır.
*   `/src/db/`: Veritabanı ile ilgili her şeyi içerir. `index.ts` (bağlantı), `schema.ts` (Drizzle şeması).
*   `/src/ai/`: Google Genkit ile ilgili AI akışlarını (`flows`) ve yapılandırmayı içerir.
*   `/analysis.py`: Maçlar için matematiksel analiz ve tahminleri üreten ana Python script'idir.
*   `/public/`: Statik dosyalar (resimler, ikonlar vb.) burada yer alır.
*   `/drizzle.config.ts`: Drizzle ORM'in veritabanı şemasını yönetmek için kullandığı yapılandırma dosyasıdır.
*   `/next.config.ts`: Next.js proje yapılandırmasıdır.
*   `/package.json`: Projenin bağımlılıklarını ve script'lerini tanımlar.
