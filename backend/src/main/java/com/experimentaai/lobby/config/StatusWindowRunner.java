package com.experimentaai.lobby.config;

import com.experimentaai.lobby.ui.StatusWindow;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.stereotype.Component;

@Component
public class StatusWindowRunner implements ApplicationListener<ApplicationReadyEvent> {

    private static final Logger logger = LoggerFactory.getLogger(StatusWindowRunner.class);
    private static final int INITIALIZATION_DELAY_MS = 1000;
    private static volatile boolean windowInitialized = false;

    private final StatusWindow statusWindow;

    public StatusWindowRunner(StatusWindow statusWindow) {
        this.statusWindow = statusWindow;
    }

    @Override
    public void onApplicationEvent(ApplicationReadyEvent event) {
        // Garantir que o listener seja executado apenas uma vez
        synchronized (StatusWindowRunner.class) {
            if (windowInitialized) {
                logger.debug("Janela já foi inicializada. Ignorando evento duplicado.");
                return;
            }
            windowInitialized = true;
        }

        logger.info("Aplicação pronta. Iniciando thread para exibir janela de status...");
        logger.info("Modo headless: {}", java.awt.GraphicsEnvironment.isHeadless());

        new Thread(() -> {
            waitForInitialization();
            logger.info("Tentando exibir janela de status...");
            statusWindow.show();
        }, "StatusWindow-Thread").start();
    }

    private void waitForInitialization() {
        try {
            Thread.sleep(INITIALIZATION_DELAY_MS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            logger.warn("Thread de inicialização interrompida", e);
        }
    }
}
