package com.experimentaai.lobby.ui;

import com.experimentaai.lobby.exception.StatusWindowException;
import com.experimentaai.lobby.service.NetworkAddressCollector;
import com.experimentaai.lobby.util.WindowsIconUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.stereotype.Component;

import javax.swing.*;
import javax.swing.border.EmptyBorder;
import java.awt.*;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.io.IOException;
import java.lang.reflect.InvocationTargetException;
import java.net.URI;
import java.util.List;

@Component
public class StatusWindow {

    private static final Logger logger = LoggerFactory.getLogger(StatusWindow.class);
    private static final String WINDOW_TITLE = "Lobby Pedidos - Experimenta aí";

    // Constants for UI dimensions
    private static final int WINDOW_WIDTH = 650;
    private static final int WINDOW_HEIGHT = 600;
    private static final Dimension MIN_WINDOW_SIZE = new Dimension(550, 450);

    private final NetworkAddressCollector addressCollector;
    private final ApplicationContext applicationContext;

    private JFrame frame;
    private volatile boolean windowShown = false;
    private SystemTray systemTray;
    private TrayIcon trayIcon;

    public StatusWindow(NetworkAddressCollector addressCollector, ApplicationContext applicationContext) {
        this.addressCollector = addressCollector;
        this.applicationContext = applicationContext;
    }

    /**
     * Theme constants for the application UI.
     */
    private static class Theme {
        static final Color PRIMARY_ORANGE = new Color(255, 107, 53);
        static final Color PRIMARY_YELLOW = new Color(255, 213, 79);
        static final Color PRIMARY_RED = new Color(220, 20, 60);
        static final Color BACKGROUND_DARK = new Color(40, 40, 40);
        static final Color CARD_BACKGROUND = new Color(255, 255, 255);
        static final Color TEXT_SECONDARY = new Color(100, 100, 100);
        static final Color TEXT_WHITE = Color.WHITE;

        static final Font FONT_EMOJI = new Font(Font.SANS_SERIF, Font.PLAIN, 28);
        static final Font FONT_TITLE = new Font(Font.SANS_SERIF, Font.BOLD, 24);
        static final Font FONT_SUBTITLE = new Font(Font.SANS_SERIF, Font.BOLD, 16);
        static final Font FONT_BADGE = new Font(Font.SANS_SERIF, Font.BOLD, 12);
        static final Font FONT_LABEL = new Font(Font.SANS_SERIF, Font.BOLD, 11);
        static final Font FONT_VALUE = new Font(Font.MONOSPACED, Font.BOLD, 11);
        static final Font FONT_BUTTON = new Font(Font.SANS_SERIF, Font.BOLD, 12);
        static final Font FONT_DNS = new Font(Font.MONOSPACED, Font.BOLD, 15);
        static final Font FONT_TYPE = new Font(Font.SANS_SERIF, Font.BOLD, 10);
    }

    @SuppressWarnings("java:S2139")
    public void show() {
        if (GraphicsEnvironment.isHeadless()) {
            logger.warn("GUI não disponível (headless mode). Janela não será exibida.");
            return;
        }

        if (focusExistingWindow()) {
            return;
        }

        synchronized (this) {
            if (windowShown) {
                logger.warn("Janela já foi exibida. Ignorando chamada duplicada.");
                bringToFront();
                return;
            }
            windowShown = true;
        }

        launchWindow();
    }

    private boolean focusExistingWindow() {
        Window existingWindow = findExistingWindow();
        if (existingWindow != null) {
            logger.info("Janela '{}' já está aberta. Trazendo para frente.", WINDOW_TITLE);
            SwingUtilities.invokeLater(() -> {
                existingWindow.toFront();
                existingWindow.requestFocus();
                if (existingWindow instanceof JFrame jframe) {
                    jframe.setState(Frame.NORMAL);
                }
            });
            return true;
        }
        return false;
    }

    private Window findExistingWindow() {
        for (Window window : Window.getWindows()) {
            if (window instanceof JFrame jframe && WINDOW_TITLE.equals(jframe.getTitle()) && jframe.isVisible()) {
                return window;
            }
        }
        return null;
    }

    private void bringToFront() {
        if (frame != null && frame.isVisible()) {
            frame.toFront();
            frame.requestFocus();
        }
    }

    private void launchWindow() {
        try {
            if (SwingUtilities.isEventDispatchThread()) {
                initAndShowFrame();
            } else {
                SwingUtilities.invokeAndWait(this::initAndShowFrame);
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new StatusWindowException("Thread interrompida durante criação da janela", e);
        } catch (InvocationTargetException e) {
            throw new StatusWindowException("Erro ao invocar criação da janela", e.getCause());
        } catch (Exception e) {
            throw new StatusWindowException("Falha ao exibir janela de status", e);
        }
    }

    private void initAndShowFrame() {
        createWindow();
        frame.setVisible(true);
        frame.toFront();
        frame.requestFocus();
    }

    private void createWindow() {
        frame = new JFrame(WINDOW_TITLE);
        frame.setDefaultCloseOperation(WindowConstants.DO_NOTHING_ON_CLOSE);
        frame.setResizable(true);
        frame.setSize(WINDOW_WIDTH, WINDOW_HEIGHT);
        frame.setLocationRelativeTo(null);
        frame.setMinimumSize(MIN_WINDOW_SIZE);

        // Apply icons using the utility
        WindowsIconUtil.applyIconToWindow(frame);

        setupSystemTray();
        setupWindowListeners();

        frame.setContentPane(createMainPanel());
    }

    private void setupWindowListeners() {
        frame.addWindowListener(new java.awt.event.WindowAdapter() {
            @Override
            public void windowClosing(java.awt.event.WindowEvent windowEvent) {
                confirmAndShutdown();
            }
        });
    }

    private void confirmAndShutdown() {
        int option = JOptionPane.showConfirmDialog(
                frame,
                "Deseja realmente fechar a aplicação?",
                "Confirmar Fechamento",
                JOptionPane.YES_NO_OPTION,
                JOptionPane.QUESTION_MESSAGE);

        if (option == JOptionPane.YES_OPTION) {
            shutdownApplication();
        }
    }

    private JPanel createMainPanel() {
        JPanel panel = new GradientPanel();
        panel.setLayout(new BorderLayout(15, 15));
        panel.setBorder(new EmptyBorder(20, 20, 20, 20));

        panel.add(createHeader(), BorderLayout.NORTH);
        panel.add(createContent(), BorderLayout.CENTER);
        panel.add(createFooter(), BorderLayout.SOUTH);

        return panel;
    }

    // --- Header Section ---

    private JPanel createHeader() {
        JPanel panel = new JPanel(new BorderLayout(10, 10));
        panel.setOpaque(false);
        panel.setBorder(new EmptyBorder(0, 0, 15, 0));

        panel.add(createTitleBlock(), BorderLayout.NORTH);
        panel.add(createSubtitle(), BorderLayout.CENTER);
        panel.add(createStatusBadge(), BorderLayout.SOUTH);

        return panel;
    }

    private JPanel createTitleBlock() {
        JPanel panel = new JPanel(new FlowLayout(FlowLayout.CENTER, 10, 5));
        panel.setOpaque(false);

        JLabel emoji = new JLabel("🍔");
        emoji.setFont(Theme.FONT_EMOJI);

        JLabel indicator = new JLabel("●");
        indicator.setFont(Theme.FONT_TITLE);
        indicator.setForeground(Theme.PRIMARY_YELLOW);

        JLabel title = new JLabel("Sistema Online");
        title.setFont(Theme.FONT_TITLE);
        title.setForeground(Theme.PRIMARY_RED);

        panel.add(emoji);
        panel.add(indicator);
        panel.add(title);

        return panel;
    }

    private JLabel createSubtitle() {
        JLabel label = new JLabel(WINDOW_TITLE);
        label.setFont(Theme.FONT_SUBTITLE);
        label.setForeground(Theme.TEXT_WHITE);
        label.setHorizontalAlignment(SwingConstants.CENTER);
        return label;
    }

    private JLabel createStatusBadge() {
        JLabel badge = new JLabel("✓ Status: Operacional");
        badge.setFont(Theme.FONT_BADGE);
        badge.setForeground(Theme.PRIMARY_RED);
        badge.setOpaque(true);
        badge.setBackground(Theme.PRIMARY_YELLOW);
        badge.setBorder(BorderFactory.createCompoundBorder(
                BorderFactory.createLineBorder(Theme.PRIMARY_RED, 2),
                new EmptyBorder(8, 20, 8, 20)));
        badge.setHorizontalAlignment(SwingConstants.CENTER);
        return badge;
    }

    // --- Content Section ---

    private JScrollPane createContent() {
        JPanel addressesPanel = new JPanel();
        addressesPanel.setLayout(new BoxLayout(addressesPanel, BoxLayout.Y_AXIS));
        addressesPanel.setOpaque(false);
        addressesPanel.setBorder(new EmptyBorder(10, 10, 10, 10));

        List<NetworkAddress> addresses = addressCollector.collect();
        for (NetworkAddress address : addresses) {
            addressesPanel.add(createAddressCard(address));
            addressesPanel.add(Box.createVerticalStrut(12));
        }

        JScrollPane scrollPane = new JScrollPane(addressesPanel);
        scrollPane.setBorder(BorderFactory.createTitledBorder(
                BorderFactory.createTitledBorder(
                        BorderFactory.createLineBorder(Theme.PRIMARY_YELLOW, 2),
                        "📍 Endereços Disponíveis",
                        0, 0,
                        new Font(Font.SANS_SERIF, Font.BOLD, 14),
                        Theme.TEXT_WHITE)));
        scrollPane.setOpaque(false);
        scrollPane.getViewport().setOpaque(false);
        scrollPane.setVerticalScrollBarPolicy(ScrollPaneConstants.VERTICAL_SCROLLBAR_AS_NEEDED);

        return scrollPane;
    }

    private JPanel createAddressCard(NetworkAddress address) {
        JPanel card = new JPanel(new BorderLayout(15, 10));
        card.setBorder(BorderFactory.createCompoundBorder(
                BorderFactory.createLineBorder(Theme.PRIMARY_ORANGE, 2),
                new EmptyBorder(15, 15, 15, 15)));
        card.setBackground(Theme.CARD_BACKGROUND);
        card.setMaximumSize(new Dimension(Integer.MAX_VALUE, 110));

        JPanel infoPanel = new JPanel(new BorderLayout(5, 5));
        infoPanel.setBackground(Theme.CARD_BACKGROUND);

        JLabel typeLabel = new JLabel(address.getType().toUpperCase());
        typeLabel.setFont(Theme.FONT_TYPE);
        typeLabel.setForeground(Theme.TEXT_SECONDARY);
        typeLabel.setBorder(new EmptyBorder(0, 0, 8, 0));

        JLabel dnsLabel = new JLabel(address.getDns());
        dnsLabel.setFont(Theme.FONT_DNS);
        dnsLabel.setForeground(Theme.PRIMARY_RED);

        infoPanel.add(typeLabel, BorderLayout.NORTH);
        infoPanel.add(dnsLabel, BorderLayout.CENTER);

        card.add(infoPanel, BorderLayout.CENTER);
        card.add(createOpenButton(address.getUrl()), BorderLayout.EAST);

        return card;
    }

    private JButton createOpenButton(String url) {
        JButton button = createStyledButton("🌐 Abrir", Theme.PRIMARY_YELLOW, Theme.PRIMARY_RED);
        button.addActionListener(e -> openInBrowser(url));
        return button;
    }

    // --- Footer Section ---

    private JPanel createFooter() {
        NetworkAddressCollector.ServerInfo info = addressCollector.getServerInfo();

        JPanel mainPanel = new JPanel(new BorderLayout(10, 10));
        mainPanel.setOpaque(false);

        JPanel infoPanel = new JPanel(new GridLayout(3, 2, 8, 8));
        infoPanel.setOpaque(false);
        infoPanel.setBorder(BorderFactory.createTitledBorder(
                BorderFactory.createLineBorder(Theme.PRIMARY_YELLOW, 2),
                "⚙️ Informações do Servidor",
                0, 0,
                Theme.FONT_BADGE,
                Theme.TEXT_WHITE));

        addInfoRow(infoPanel, "Hostname:", info.getHostname());
        addInfoRow(infoPanel, "IP:", info.getIpAddress());
        addInfoRow(infoPanel, "Porta:", String.valueOf(info.getPort()));

        JPanel buttonPanel = new JPanel(new FlowLayout(FlowLayout.CENTER, 10, 5));
        buttonPanel.setOpaque(false);

        JButton minimizeButton = createStyledButton("📥 Minimizar para Bandeja", Theme.PRIMARY_YELLOW,
                Theme.PRIMARY_RED);
        minimizeButton.addActionListener(e -> minimizeToTray());
        buttonPanel.add(minimizeButton);

        mainPanel.add(infoPanel, BorderLayout.CENTER);
        mainPanel.add(buttonPanel, BorderLayout.SOUTH);

        return mainPanel;
    }

    private void addInfoRow(JPanel panel, String label, String value) {
        JLabel labelComponent = new JLabel(label);
        labelComponent.setFont(Theme.FONT_LABEL);
        labelComponent.setForeground(Theme.PRIMARY_YELLOW);

        JLabel valueComponent = new JLabel(value);
        valueComponent.setFont(Theme.FONT_VALUE);
        valueComponent.setForeground(Theme.TEXT_WHITE);

        panel.add(labelComponent);
        panel.add(valueComponent);
    }

    // --- UI Helpers ---

    private JButton createStyledButton(String text, Color bg, Color fg) {
        JButton button = new JButton(text);
        button.setFont(Theme.FONT_BUTTON);
        button.setBackground(bg);
        button.setForeground(fg);
        button.setFocusPainted(false);
        button.setBorderPainted(true);
        button.setBorder(BorderFactory.createLineBorder(fg, 2));
        button.setCursor(new Cursor(Cursor.HAND_CURSOR));

        button.addMouseListener(new MouseAdapter() {
            @Override
            public void mouseEntered(MouseEvent evt) {
                button.setBackground(Theme.PRIMARY_ORANGE);
            }

            @Override
            public void mouseExited(MouseEvent evt) {
                button.setBackground(bg);
            }
        });

        return button;
    }

    private static class GradientPanel extends JPanel {
        @Override
        protected void paintComponent(Graphics g) {
            super.paintComponent(g);
            Graphics2D g2d = (Graphics2D) g.create();
            int width = getWidth();
            int height = getHeight();
            GradientPaint gradient = new GradientPaint(
                    0, 0, Theme.PRIMARY_ORANGE,
                    0, height, Theme.BACKGROUND_DARK);
            g2d.setPaint(gradient);
            g2d.fillRect(0, 0, width, height);
            g2d.dispose();
        }
    }

    // --- System Tray & Actions ---

    private void setupSystemTray() {
        if (!SystemTray.isSupported()) {
            logger.warn("SystemTray não é suportado.");
            return;
        }

        try {
            systemTray = SystemTray.getSystemTray();
            Image trayImage = WindowsIconUtil.createTrayIcon();

            if (trayImage == null) {
                logger.warn("Ícone da bandeja não pôde ser criado.");
                return;
            }

            PopupMenu popup = new PopupMenu();

            MenuItem restoreItem = new MenuItem("Restaurar Janela");
            restoreItem.addActionListener(e -> restoreFromTray());
            popup.add(restoreItem);

            popup.addSeparator();

            MenuItem exitItem = new MenuItem("Sair");
            exitItem.addActionListener(e -> shutdownApplication());
            popup.add(exitItem);

            trayIcon = new TrayIcon(trayImage, WINDOW_TITLE, popup);
            trayIcon.setImageAutoSize(true);
            trayIcon.addActionListener(e -> restoreFromTray());

            systemTray.add(trayIcon);
            logger.info("SystemTray configurado com sucesso.");

        } catch (AWTException e) {
            logger.error("Erro ao configurar SystemTray", e);
        }
    }

    private void minimizeToTray() {
        if (frame != null && systemTray != null && trayIcon != null) {
            frame.setVisible(false);
            trayIcon.displayMessage(WINDOW_TITLE, "Aplicação minimizada para a bandeja", TrayIcon.MessageType.INFO);
        }
    }

    private void restoreFromTray() {
        if (frame != null) {
            frame.setVisible(true);
            frame.setState(Frame.NORMAL);
            frame.toFront();
            frame.requestFocus();
        }
    }

    private void shutdownApplication() {
        logger.info("Encerrando aplicação...");
        if (systemTray != null && trayIcon != null) {
            systemTray.remove(trayIcon);
        }
        if (frame != null) {
            frame.dispose();
        }
        if (applicationContext instanceof ConfigurableApplicationContext configurableContext) {
            configurableContext.close();
        }
        System.exit(0);
    }

    private void openInBrowser(String url) {
        try {
            if (Desktop.isDesktopSupported() && Desktop.getDesktop().isSupported(Desktop.Action.BROWSE)) {
                Desktop.getDesktop().browse(new URI(url));
            } else {
                Runtime.getRuntime().exec("rundll32 url.dll,FileProtocolHandler " + url);
            }
        } catch (Exception e) {
            logger.error("Erro ao abrir navegador: {}", e.getMessage());
            JOptionPane.showMessageDialog(frame, "Erro ao abrir navegador: " + e.getMessage(), "Erro",
                    JOptionPane.ERROR_MESSAGE);
        }
    }
}
