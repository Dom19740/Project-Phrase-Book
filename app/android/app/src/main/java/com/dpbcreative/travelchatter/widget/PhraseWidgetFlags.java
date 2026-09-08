package com.dpbcreative.travelchatter.widget;

import java.util.HashMap;
import java.util.Map;

/**
 * Java port of app/src/lib/languageFlags.ts#getLanguageFlag — keep the two in sync. Duplicated
 * rather than shared because the widget runs in the native process and has no access to the JS
 * bundle.
 */
final class PhraseWidgetFlags {

    private PhraseWidgetFlags() {}

    private static final String GLOBE = "🌐";

    private static final Map<String, String> CODE_OVERRIDES = new HashMap<>();
    private static final Map<String, String> LANGUAGE_TO_COUNTRY = new HashMap<>();

    static {
        CODE_OVERRIDES.put("en-GB", "GB");
        CODE_OVERRIDES.put("en-US", "US");
        CODE_OVERRIDES.put("fr-CA", "CA");
        CODE_OVERRIDES.put("fr-FR", "FR");
        CODE_OVERRIDES.put("pt-BR", "BR");
        CODE_OVERRIDES.put("pt-PT", "PT");
        CODE_OVERRIDES.put("zh-CN", "CN");
        CODE_OVERRIDES.put("zh-TW", "TW");
        CODE_OVERRIDES.put("es-ES", "ES");

        LANGUAGE_TO_COUNTRY.put("af", "ZA");
        LANGUAGE_TO_COUNTRY.put("sq", "AL");
        LANGUAGE_TO_COUNTRY.put("am", "ET");
        LANGUAGE_TO_COUNTRY.put("ar", "SA");
        LANGUAGE_TO_COUNTRY.put("hy", "AM");
        LANGUAGE_TO_COUNTRY.put("az", "AZ");
        LANGUAGE_TO_COUNTRY.put("eu", "ES");
        LANGUAGE_TO_COUNTRY.put("bn", "BD");
        LANGUAGE_TO_COUNTRY.put("bs", "BA");
        LANGUAGE_TO_COUNTRY.put("bg", "BG");
        LANGUAGE_TO_COUNTRY.put("my", "MM");
        LANGUAGE_TO_COUNTRY.put("ca", "ES");
        LANGUAGE_TO_COUNTRY.put("yue", "HK");
        LANGUAGE_TO_COUNTRY.put("hr", "HR");
        LANGUAGE_TO_COUNTRY.put("cs", "CZ");
        LANGUAGE_TO_COUNTRY.put("da", "DK");
        LANGUAGE_TO_COUNTRY.put("prs", "AF");
        LANGUAGE_TO_COUNTRY.put("nl", "NL");
        LANGUAGE_TO_COUNTRY.put("et", "EE");
        LANGUAGE_TO_COUNTRY.put("tl", "PH");
        LANGUAGE_TO_COUNTRY.put("fi", "FI");
        LANGUAGE_TO_COUNTRY.put("ka", "GE");
        LANGUAGE_TO_COUNTRY.put("de", "DE");
        LANGUAGE_TO_COUNTRY.put("el", "GR");
        LANGUAGE_TO_COUNTRY.put("gu", "IN");
        LANGUAGE_TO_COUNTRY.put("ht", "HT");
        LANGUAGE_TO_COUNTRY.put("ha", "NG");
        LANGUAGE_TO_COUNTRY.put("haw", "US");
        LANGUAGE_TO_COUNTRY.put("he", "IL");
        LANGUAGE_TO_COUNTRY.put("hi", "IN");
        LANGUAGE_TO_COUNTRY.put("hu", "HU");
        LANGUAGE_TO_COUNTRY.put("is", "IS");
        LANGUAGE_TO_COUNTRY.put("ig", "NG");
        LANGUAGE_TO_COUNTRY.put("id", "ID");
        LANGUAGE_TO_COUNTRY.put("ga", "IE");
        LANGUAGE_TO_COUNTRY.put("it", "IT");
        LANGUAGE_TO_COUNTRY.put("ja", "JP");
        LANGUAGE_TO_COUNTRY.put("kn", "IN");
        LANGUAGE_TO_COUNTRY.put("kk", "KZ");
        LANGUAGE_TO_COUNTRY.put("km", "KH");
        LANGUAGE_TO_COUNTRY.put("ko", "KR");
        LANGUAGE_TO_COUNTRY.put("lo", "LA");
        LANGUAGE_TO_COUNTRY.put("lv", "LV");
        LANGUAGE_TO_COUNTRY.put("lt", "LT");
        LANGUAGE_TO_COUNTRY.put("lb", "LU");
        LANGUAGE_TO_COUNTRY.put("mk", "MK");
        LANGUAGE_TO_COUNTRY.put("ms", "MY");
        LANGUAGE_TO_COUNTRY.put("ml", "IN");
        LANGUAGE_TO_COUNTRY.put("mt", "MT");
        LANGUAGE_TO_COUNTRY.put("mi", "NZ");
        LANGUAGE_TO_COUNTRY.put("mr", "IN");
        LANGUAGE_TO_COUNTRY.put("mn", "MN");
        LANGUAGE_TO_COUNTRY.put("ne", "NP");
        LANGUAGE_TO_COUNTRY.put("no", "NO");
        LANGUAGE_TO_COUNTRY.put("ps", "AF");
        LANGUAGE_TO_COUNTRY.put("fa", "IR");
        LANGUAGE_TO_COUNTRY.put("pl", "PL");
        LANGUAGE_TO_COUNTRY.put("pa", "IN");
        LANGUAGE_TO_COUNTRY.put("ro", "RO");
        LANGUAGE_TO_COUNTRY.put("ru", "RU");
        LANGUAGE_TO_COUNTRY.put("sm", "WS");
        LANGUAGE_TO_COUNTRY.put("gd", "GB");
        LANGUAGE_TO_COUNTRY.put("sr", "RS");
        LANGUAGE_TO_COUNTRY.put("si", "LK");
        LANGUAGE_TO_COUNTRY.put("sk", "SK");
        LANGUAGE_TO_COUNTRY.put("sl", "SI");
        LANGUAGE_TO_COUNTRY.put("so", "SO");
        LANGUAGE_TO_COUNTRY.put("sw", "KE");
        LANGUAGE_TO_COUNTRY.put("sv", "SE");
        LANGUAGE_TO_COUNTRY.put("ta", "IN");
        LANGUAGE_TO_COUNTRY.put("te", "IN");
        LANGUAGE_TO_COUNTRY.put("th", "TH");
        LANGUAGE_TO_COUNTRY.put("tr", "TR");
        LANGUAGE_TO_COUNTRY.put("uk", "UA");
        LANGUAGE_TO_COUNTRY.put("ur", "PK");
        LANGUAGE_TO_COUNTRY.put("uz", "UZ");
        LANGUAGE_TO_COUNTRY.put("vi", "VN");
        LANGUAGE_TO_COUNTRY.put("cy", "GB");
        LANGUAGE_TO_COUNTRY.put("xh", "ZA");
        LANGUAGE_TO_COUNTRY.put("yo", "NG");
        LANGUAGE_TO_COUNTRY.put("zu", "ZA");
        LANGUAGE_TO_COUNTRY.put("en", "GB");
        LANGUAGE_TO_COUNTRY.put("es", "ES");
        LANGUAGE_TO_COUNTRY.put("fr", "FR");
        LANGUAGE_TO_COUNTRY.put("pt", "PT");
        LANGUAGE_TO_COUNTRY.put("zh", "CN");
    }

    private static String countryCodeToFlag(String countryCode) {
        String upper = countryCode.toUpperCase();
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < upper.length(); i++) {
            sb.appendCodePoint(127397 + upper.charAt(i));
        }
        return sb.toString();
    }

    static String getLanguageFlag(String code) {
        if (code == null || code.isEmpty()) return GLOBE;
        if ("es-419".equals(code)) return GLOBE;

        String override = CODE_OVERRIDES.get(code);
        if (override != null) return countryCodeToFlag(override);

        String[] parts = code.split("-");
        String base = parts[0];
        if (parts.length > 1 && parts[1].length() == 2) return countryCodeToFlag(parts[1]);

        String country = LANGUAGE_TO_COUNTRY.get(base.toLowerCase());
        if (country != null) return countryCodeToFlag(country);

        return GLOBE;
    }
}
