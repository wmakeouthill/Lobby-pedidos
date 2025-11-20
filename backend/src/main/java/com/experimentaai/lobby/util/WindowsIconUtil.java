package com.experimentaai.lobby.util;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.swing.*;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.File;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;

/**
 * Utilitário para gerenciar ícones de aplicação no Windows.
 * Garante que o ícone seja exibido corretamente na barra de tarefas,
 * bandeja do sistema e header da janela.
 */
public class WindowsIconUtil {

    private static final Logger logger = LoggerFactory.getLogger(WindowsIconUtil.class);
    private static final int[] ICON_SIZES = { 16, 20, 24, 32, 40, 48, 64, 96, 128, 256 };
    private static final int TRAY_ICON_SIZE = 32;

    private WindowsIconUtil() {
        // Classe utilitária - não deve ser instanciada
    }

    /**
     * Carrega o ícone da aplicação de múltiplas fontes possíveis.
     *
     * @return BufferedImage do ícone ou null se não encontrado
     */
    public static BufferedImage loadApplicationIcon() {
        BufferedImage iconImage = null;
        String iconSource = null;

        // Método 1: Tentar carregar icon.ico dos resources
        // Tentar múltiplas formas de acessar o resource
        URL icoUrl = null;
        try {
            icoUrl = WindowsIconUtil.class.getResource("/icon.ico");
            if (icoUrl == null) {
                // Tentar via ClassLoader
                icoUrl = WindowsIconUtil.class.getClassLoader().getResource("icon.ico");
            }
            if (icoUrl == null) {
                // Tentar via Thread context classloader
                ClassLoader contextLoader = Thread.currentThread().getContextClassLoader();
                if (contextLoader != null) {
                    icoUrl = contextLoader.getResource("icon.ico");
                }
            }
            // Tentar caminho específico para JAR executável
            if (icoUrl == null) {
                try {
                    icoUrl = WindowsIconUtil.class.getClassLoader().getResource("BOOT-INF/classes/icon.ico");
                } catch (Exception e) {
                    logger.debug("Erro ao tentar caminho BOOT-INF: {}", e.getMessage());
                }
            }
        } catch (Exception e) {
            logger.debug("Erro ao buscar resource /icon.ico: {}", e.getMessage());
        }

        if (icoUrl != null) {
            logger.info("Tentando carregar ícone de resource: {} (protocolo: {})", icoUrl, icoUrl.getProtocol());
            iconImage = loadIconFromUrl(icoUrl);
            if (iconImage != null) {
                iconSource = "/icon.ico (resources)";
                logger.info("Ícone carregado de: {} ({}x{})", iconSource,
                        iconImage.getWidth(), iconImage.getHeight());
            } else {
                logger.warn("Falha ao carregar ícone de resource: {}", icoUrl);
            }
        } else {
            logger.warn("Ícone não encontrado em /icon.ico (resources) - tentando métodos alternativos");
            // Debug: listar todos os resources disponíveis na raiz
            try {
                java.util.Enumeration<java.net.URL> resources = WindowsIconUtil.class.getClassLoader().getResources("");
                while (resources.hasMoreElements()) {
                    logger.debug("Resource path encontrado: {}", resources.nextElement());
                }
            } catch (Exception e) {
                logger.debug("Erro ao listar resources: {}", e.getMessage());
            }
        }

        // Método 2: Tentar carregar icon.png dos resources como fallback
        if (iconImage == null) {
            URL pngUrl = WindowsIconUtil.class.getResource("/icon.png");
            if (pngUrl != null) {
                logger.debug("Tentando carregar ícone PNG de: {}", pngUrl);
                iconImage = loadIconFromUrl(pngUrl);
                if (iconImage != null) {
                    iconSource = "/icon.png (resources)";
                    logger.info("Ícone carregado de: {}", iconSource);
                } else {
                    logger.debug("Falha ao carregar ícone PNG de {}", pngUrl);
                }
            } else {
                logger.debug("Ícone não encontrado em /icon.png (resources)");
            }
        }

        // Método 3: Tentar carregar de caminhos relativos ao executável
        if (iconImage == null) {
            File iconFile = findIconFile();
            if (iconFile != null && iconFile.exists()) {
                logger.debug("Tentando carregar ícone de arquivo: {}", iconFile.getAbsolutePath());
                iconImage = loadIconFromFile(iconFile);
                if (iconImage != null) {
                    iconSource = iconFile.getAbsolutePath();
                    logger.info("Ícone carregado de: {} ({}x{})", iconSource,
                            iconImage.getWidth(), iconImage.getHeight());
                } else {
                    logger.debug("Falha ao carregar ícone de arquivo: {}", iconFile.getAbsolutePath());
                }
            } else {
                logger.debug("Nenhum arquivo de ícone encontrado nos caminhos relativos");
            }
        }

        // Método 4: Tentar carregar diretamente do classpath do Spring Boot
        if (iconImage == null) {
            try {
                // Quando executando como JAR, os recursos ficam em BOOT-INF/classes/
                URL bootInfUrl = WindowsIconUtil.class.getClassLoader().getResource("BOOT-INF/classes/icon.ico");
                if (bootInfUrl != null) {
                    logger.info("Tentando carregar ícone do BOOT-INF/classes: {}", bootInfUrl);
                    iconImage = loadIconFromUrl(bootInfUrl);
                    if (iconImage != null) {
                        iconSource = "BOOT-INF/classes/icon.ico";
                        logger.info("Ícone carregado de: {} ({}x{})", iconSource,
                                iconImage.getWidth(), iconImage.getHeight());
                    }
                }
            } catch (Exception e) {
                logger.debug("Erro ao tentar carregar ícone do BOOT-INF: {}", e.getMessage());
            }
        }

        // Método 5: Tentar carregar do diretório de resources usando caminho absoluto
        // Isso é especialmente útil quando rodando de uma IDE
        if (iconImage == null) {
            try {
                String userDir = System.getProperty("user.dir", "");
                // Normalizar separadores de caminho para Windows
                String normalizedUserDir = userDir.replace("\\", "/");

                String[] resourcePaths = {
                        normalizedUserDir + "/backend/src/main/resources/icon.ico",
                        normalizedUserDir + "/src/main/resources/icon.ico",
                        normalizedUserDir + "/icon/icon.ico",
                        userDir + "\\backend\\src\\main\\resources\\icon.ico", // Windows path
                        userDir + "\\src\\main\\resources\\icon.ico", // Windows path
                        userDir + "\\icon\\icon.ico" // Windows path
                };

                logger.info("Buscando ícone em caminhos absolutos. user.dir: {}", userDir);
                for (String path : resourcePaths) {
                    File iconFile = new File(path);
                    logger.debug("Verificando caminho: {} (existe: {}, é arquivo: {})",
                            path, iconFile.exists(), iconFile.isFile());
                    if (iconFile.exists() && iconFile.isFile()) {
                        logger.info("Arquivo encontrado! Tentando carregar ícone de: {}", iconFile.getAbsolutePath());
                        iconImage = loadIconFromFile(iconFile);
                        if (iconImage != null) {
                            iconSource = iconFile.getAbsolutePath();
                            logger.info("Ícone carregado de: {} ({}x{})", iconSource,
                                    iconImage.getWidth(), iconImage.getHeight());
                            break;
                        } else {
                            logger.warn("Arquivo existe mas falhou ao carregar: {}", iconFile.getAbsolutePath());
                        }
                    }
                }
            } catch (Exception e) {
                logger.debug("Erro ao tentar carregar ícone de caminhos absolutos: {}", e.getMessage());
            }
        }

        if (iconImage == null) {
            logger.warn("Ícone customizado não encontrado em nenhuma localização. " +
                    "Verifique se o arquivo icon.ico existe em src/main/resources/");
        }

        return iconImage;
    }

    /**
     * Aplica o ícone à janela Swing com múltiplos tamanhos para melhor
     * compatibilidade.
     *
     * @param frame A janela JFrame onde aplicar o ícone
     */
    public static void applyIconToWindow(JFrame frame) {
        if (frame == null) {
            logger.warn("Tentativa de aplicar ícone a janela nula");
            return;
        }

        BufferedImage iconImage = loadApplicationIcon();
        if (iconImage == null) {
            logger.warn("Não foi possível aplicar ícone à janela - ícone não encontrado");
            return;
        }

        try {
            List<Image> iconImages = createMultiSizeIconList(iconImage);
            frame.setIconImages(iconImages);

            // No Windows, também precisamos definir o ícone do processo
            setWindowsProcessIcon(iconImage);

            logger.info("Ícone aplicado à janela com sucesso - {} tamanhos", iconImages.size());
        } catch (Exception e) {
            logger.error("Erro ao aplicar ícone à janela", e);
        }
    }

    /**
     * Cria um ícone otimizado para a bandeja do sistema.
     *
     * @return Image do ícone para a bandeja ou null se não encontrado
     */
    public static Image createTrayIcon() {
        BufferedImage iconImage = loadApplicationIcon();
        if (iconImage == null) {
            logger.warn("Não foi possível criar ícone da bandeja - ícone não encontrado");
            return null;
        }

        try {
            int width = iconImage.getWidth();
            int height = iconImage.getHeight();

            if (width > 0 && height > 0) {
                // Redimensionar para o tamanho padrão da bandeja do Windows (32x32)
                if (width != TRAY_ICON_SIZE || height != TRAY_ICON_SIZE) {
                    return resizeImage(iconImage, TRAY_ICON_SIZE, TRAY_ICON_SIZE);
                }
                return iconImage;
            } else {
                logger.warn("Ícone carregado mas com dimensões inválidas: {}x{}", width, height);
            }
        } catch (Exception e) {
            logger.error("Erro ao criar ícone da bandeja", e);
        }

        return null;
    }

    /**
     * Define o ícone do processo no Windows usando APIs nativas.
     * Isso garante que o ícone apareça na barra de tarefas.
     *
     * Nota: Quando rodando de uma IDE (como IntelliJ), o ícone na barra de tarefas
     * pode não aparecer porque o Windows usa o ícone do executável (java.exe ou
     * javaw.exe).
     * O ícone funcionará corretamente quando a aplicação for compilada como
     * executável (.exe).
     *
     * @param iconImage A imagem do ícone a ser aplicada
     */
    private static void setWindowsProcessIcon(BufferedImage iconImage) {
        if (!isWindows()) {
            logger.debug("Sistema não é Windows, pulando definição de ícone do processo");
            return;
        }

        // Verificar se está rodando de uma IDE (detecta se o classpath contém paths
        // típicos de IDE)
        boolean runningFromIDE = isRunningFromIDE();

        try {
            // Tentar usar a API Taskbar (Java 9+)
            if (Taskbar.isTaskbarSupported()) {
                Taskbar taskbar = Taskbar.getTaskbar();
                if (taskbar.isSupported(Taskbar.Feature.ICON_IMAGE)) {
                    taskbar.setIconImage(iconImage);
                    if (runningFromIDE) {
                        logger.info(
                                "Ícone do processo definido via Taskbar API (rodando de IDE - pode não aparecer na barra de tarefas)");
                    } else {
                        logger.info("Ícone do processo definido via Taskbar API");
                    }
                    return;
                } else {
                    logger.debug("Taskbar API não suporta ICON_IMAGE neste sistema");
                }
            } else {
                logger.debug("Taskbar não é suportado neste sistema");
            }
        } catch (Exception e) {
            logger.debug("Erro ao usar Taskbar API: {}", e.getMessage());
        }

        // Método alternativo: usar System.setProperty para definir o ícone
        // Isso funciona para algumas versões do Windows, mas é limitado
        try {
            URL iconUrl = WindowsIconUtil.class.getResource("/icon.ico");
            if (iconUrl == null) {
                // Tentar outros caminhos
                iconUrl = WindowsIconUtil.class.getClassLoader().getResource("BOOT-INF/classes/icon.ico");
            }
            if (iconUrl != null) {
                System.setProperty("java.awt.application.icon", iconUrl.toString());
                logger.debug("Propriedade java.awt.application.icon definida: {}", iconUrl);
            } else {
                logger.debug("URL do ícone não encontrada para propriedade do sistema");
            }
        } catch (Exception e) {
            logger.debug("Não foi possível definir ícone via propriedade do sistema: {}", e.getMessage());
        }

        // Tentar definir ícone via reflection (último recurso)
        try {
            Class<?> toolkitClass = Toolkit.getDefaultToolkit().getClass();
            java.lang.reflect.Field awtAppClassNameField = toolkitClass.getDeclaredField("awtAppClassName");
            awtAppClassNameField.setAccessible(true);
            awtAppClassNameField.set(null, "Lobby Pedidos");
            logger.debug("Nome da aplicação definido via reflection");
        } catch (Exception e) {
            logger.debug("Não foi possível definir nome da aplicação via reflection: {}", e.getMessage());
        }

        if (runningFromIDE) {
            logger.info("Aplicação rodando de IDE - ícone na barra de tarefas pode não aparecer. " +
                    "O ícone funcionará corretamente quando compilado como executável (.exe)");
        }
    }

    /**
     * Detecta se a aplicação está rodando de uma IDE (IntelliJ, Eclipse, etc).
     * 
     * @return true se estiver rodando de uma IDE
     */
    private static boolean isRunningFromIDE() {
        String classPath = System.getProperty("java.class.path", "");
        String javaHome = System.getProperty("java.home", "");

        // Detectar paths típicos de IDEs
        boolean hasIDEIndicators = classPath.contains(".idea") ||
                classPath.contains("eclipse") ||
                classPath.contains("target/classes") ||
                javaHome.contains("jbr") || // JetBrains Runtime
                javaHome.contains("jdk");

        // Verificar se o processo Java é o padrão (não um executável customizado)
        String javaCommand = System.getProperty("sun.java.command", "");
        boolean isStandardJava = javaCommand.contains("com.intellij") ||
                javaCommand.contains("org.eclipse") ||
                !javaCommand.contains(".exe");

        return hasIDEIndicators || isStandardJava;
    }

    /**
     * Carrega um ícone de uma URL.
     *
     * @param url URL do ícone
     * @return BufferedImage ou null se falhar
     */
    private static BufferedImage loadIconFromUrl(URL url) {
        if (url == null) {
            return null;
        }

        logger.debug("Tentando carregar ícone da URL: {}", url);

        // Primeiro tentar ImageIcon (mais confiável para ICO)
        try {
            ImageIcon icon = new ImageIcon(url);
            if (icon.getIconWidth() > 0 && icon.getIconHeight() > 0) {
                BufferedImage result = imageToBufferedImage(icon.getImage());
                if (result != null && result.getWidth() > 0 && result.getHeight() > 0) {
                    logger.debug("Ícone carregado com sucesso via ImageIcon: {}x{}",
                            result.getWidth(), result.getHeight());
                    return result;
                }
            } else {
                logger.debug("ImageIcon retornou dimensões inválidas: {}x{}",
                        icon.getIconWidth(), icon.getIconHeight());
            }
        } catch (Exception e) {
            logger.debug("Erro ao carregar ícone de URL via ImageIcon: {}", e.getMessage());
        }

        // Fallback: tentar ImageIO
        try {
            BufferedImage image = javax.imageio.ImageIO.read(url);
            if (image != null && image.getWidth() > 0 && image.getHeight() > 0) {
                logger.debug("Ícone carregado com sucesso via ImageIO: {}x{}",
                        image.getWidth(), image.getHeight());
                return image;
            } else {
                logger.debug("ImageIO retornou imagem inválida");
            }
        } catch (Exception e) {
            logger.debug("Erro ao carregar ícone de URL via ImageIO: {}", e.getMessage());
        }

        // Último fallback: Toolkit
        try {
            Image toolkitImage = Toolkit.getDefaultToolkit().getImage(url);
            if (toolkitImage != null) {
                BufferedImage buffered = waitForImageAndConvert(toolkitImage);
                if (buffered != null && buffered.getWidth() > 0 && buffered.getHeight() > 0) {
                    logger.debug("Ícone carregado com sucesso via Toolkit: {}x{}",
                            buffered.getWidth(), buffered.getHeight());
                    return buffered;
                } else {
                    logger.debug("Toolkit retornou imagem inválida (dimensões: {}x{})",
                            buffered != null ? buffered.getWidth() : 0,
                            buffered != null ? buffered.getHeight() : 0);
                }
            }
        } catch (Exception e) {
            logger.debug("Erro ao carregar ícone de URL via Toolkit: {}", e.getMessage());
        }

        logger.debug("Todos os métodos de carregamento falharam para URL: {}", url);
        return null;
    }

    /**
     * Carrega um ícone de um arquivo.
     *
     * @param file Arquivo do ícone
     * @return BufferedImage ou null se falhar
     */
    private static BufferedImage loadIconFromFile(File file) {
        if (file == null || !file.exists() || !file.isFile()) {
            logger.debug("Arquivo de ícone inválido ou não existe: {}", file);
            return null;
        }

        logger.debug("Carregando ícone de arquivo: {} (tamanho: {} bytes)",
                file.getAbsolutePath(), file.length());

        // Primeiro tentar ImageIcon (mais confiável para ICO)
        try {
            ImageIcon icon = new ImageIcon(file.getAbsolutePath());
            if (icon.getIconWidth() > 0 && icon.getIconHeight() > 0) {
                BufferedImage result = imageToBufferedImage(icon.getImage());
                if (result != null && result.getWidth() > 0 && result.getHeight() > 0) {
                    logger.debug("Ícone carregado via ImageIcon: {}x{}",
                            result.getWidth(), result.getHeight());
                    return result;
                } else {
                    logger.debug("ImageIcon retornou imagem inválida");
                }
            } else {
                logger.debug("ImageIcon retornou dimensões inválidas: {}x{}",
                        icon.getIconWidth(), icon.getIconHeight());
            }
        } catch (Exception e) {
            logger.debug("Erro ao carregar ícone de arquivo via ImageIcon: {}", e.getMessage());
        }

        // Fallback: ImageIO
        try {
            BufferedImage image = javax.imageio.ImageIO.read(file);
            if (image != null && image.getWidth() > 0 && image.getHeight() > 0) {
                logger.debug("Ícone carregado via ImageIO: {}x{}", image.getWidth(), image.getHeight());
                return image;
            } else {
                logger.debug("ImageIO retornou imagem inválida");
            }
        } catch (Exception e) {
            logger.debug("Erro ao carregar ícone de arquivo via ImageIO: {}", e.getMessage());
        }

        // Último fallback: Toolkit
        try {
            Image toolkitImage = Toolkit.getDefaultToolkit().getImage(file.getAbsolutePath());
            if (toolkitImage != null) {
                BufferedImage buffered = waitForImageAndConvert(toolkitImage);
                if (buffered != null && buffered.getWidth() > 0 && buffered.getHeight() > 0) {
                    logger.debug("Ícone carregado via Toolkit: {}x{}",
                            buffered.getWidth(), buffered.getHeight());
                    return buffered;
                } else {
                    logger.debug("Toolkit retornou imagem inválida");
                }
            }
        } catch (Exception e) {
            logger.debug("Erro ao carregar ícone de arquivo via Toolkit: {}", e.getMessage());
        }

        logger.debug("Todos os métodos falharam ao carregar ícone de: {}", file.getAbsolutePath());
        return null;
    }

    /**
     * Aguarda o carregamento completo de uma imagem e converte para BufferedImage.
     *
     * @param image A imagem a ser convertida
     * @return BufferedImage ou null se falhar
     */
    private static BufferedImage waitForImageAndConvert(Image image) {
        if (image == null) {
            return null;
        }

        try {
            JPanel tempPanel = new JPanel();
            MediaTracker tracker = new MediaTracker(tempPanel);
            tracker.addImage(image, 0);
            tracker.waitForAll(2000);

            return imageToBufferedImage(image);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return imageToBufferedImage(image);
        } catch (Exception e) {
            logger.debug("Erro ao aguardar carregamento de imagem: {}", e.getMessage());
            return imageToBufferedImage(image);
        }
    }

    /**
     * Converte uma Image para BufferedImage.
     *
     * @param image A imagem a ser convertida
     * @return BufferedImage ou null se falhar
     */
    private static BufferedImage imageToBufferedImage(Image image) {
        if (image == null) {
            return null;
        }

        if (image instanceof BufferedImage bufferedImage) {
            return bufferedImage;
        }

        int width = image.getWidth(null);
        int height = image.getHeight(null);

        if (width <= 0 || height <= 0) {
            return null;
        }

        BufferedImage buffered = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = buffered.createGraphics();
        g.drawImage(image, 0, 0, null);
        g.dispose();
        return buffered;
    }

    /**
     * Cria uma lista de imagens em múltiplos tamanhos para melhor compatibilidade.
     *
     * @param sourceImage A imagem fonte
     * @return Lista de imagens em diferentes tamanhos
     */
    private static List<Image> createMultiSizeIconList(BufferedImage sourceImage) {
        List<Image> iconImages = new ArrayList<>();

        for (int size : ICON_SIZES) {
            BufferedImage scaled = resizeImage(sourceImage, size, size);
            iconImages.add(scaled);
        }

        // Adicionar também a imagem original se for diferente
        boolean alreadyAdded = iconImages.stream()
                .anyMatch(img -> img.getWidth(null) == sourceImage.getWidth() &&
                        img.getHeight(null) == sourceImage.getHeight());

        if (!alreadyAdded && sourceImage.getWidth() > 0 && sourceImage.getHeight() > 0) {
            iconImages.add(sourceImage);
        }

        return iconImages;
    }

    /**
     * Redimensiona uma imagem mantendo qualidade.
     *
     * @param original A imagem original
     * @param width    Nova largura
     * @param height   Nova altura
     * @return BufferedImage redimensionada
     */
    private static BufferedImage resizeImage(BufferedImage original, int width, int height) {
        BufferedImage resized = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = resized.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.drawImage(original, 0, 0, width, height, null);
        g.dispose();
        return resized;
    }

    /**
     * Procura o arquivo de ícone em vários caminhos possíveis.
     *
     * @return File do ícone ou null se não encontrado
     */
    private static File findIconFile() {
        String[] possiblePaths = {
                "../icon/icon.ico",
                "icon/icon.ico",
                "../../icon/icon.ico",
                System.getProperty("user.dir") + "/icon/icon.ico"
        };

        for (String path : possiblePaths) {
            File iconFile = new File(path);
            if (iconFile.exists() && iconFile.isFile()) {
                return iconFile;
            }
        }

        return null;
    }

    /**
     * Verifica se o sistema operacional é Windows.
     *
     * @return true se for Windows
     */
    private static boolean isWindows() {
        String os = System.getProperty("os.name", "").toLowerCase();
        return os.contains("win");
    }
}
