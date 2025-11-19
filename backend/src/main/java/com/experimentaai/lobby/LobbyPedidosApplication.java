package com.experimentaai.lobby;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class LobbyPedidosApplication {

    public static void main(String[] args) {
        // Garantir que a aplicação não execute em modo headless
        // Isso deve ser feito ANTES de iniciar o Spring Boot
        System.setProperty("java.awt.headless", "false");

        SpringApplication.run(LobbyPedidosApplication.class, args);
    }
}
