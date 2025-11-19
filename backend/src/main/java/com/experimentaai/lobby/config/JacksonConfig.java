package com.experimentaai.lobby.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

/**
 * Configuração do ObjectMapper como bean singleton do Spring.
 * Isso garante que seja reutilizado e gerenciado pelo Spring, evitando memory leaks.
 */
@Configuration
public class JacksonConfig {

    @Bean
    @Primary
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        // Registrar módulo JSR310 para suportar LocalDateTime, LocalDate, etc.
        mapper.registerModule(new JavaTimeModule());
        // Desabilitar escrita de datas como timestamps (escrever como ISO-8601 string)
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        return mapper;
    }
}

