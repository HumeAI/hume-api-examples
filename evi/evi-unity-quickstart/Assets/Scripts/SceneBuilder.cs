using UnityEngine;

public class SceneBuilder : MonoBehaviour
{
    [Header("Set your API key here BEFORE pressing Play!")]
    [SerializeField] private string humeApiKey = "YOUR_HUME_API_KEY_HERE";

    void Awake()
    {
        Debug.Log("SceneBuilder Awake()");
    }

    void Start()
    {
        BuildScene();
    }

    void BuildScene()
    {
        GameObject cube = new GameObject("ConversationCube");
        cube.transform.position = Vector3.zero;

        GameObject cubeBody = GameObject.CreatePrimitive(PrimitiveType.Cube);
        cubeBody.transform.SetParent(cube.transform);
        cubeBody.transform.localScale = Vector3.one;

        // Start with a neutral gray color
        Renderer renderer = cubeBody.GetComponent<Renderer>();
        renderer.material.color = Color.gray;

        // Add audio and EVI components to parent
        AudioSource audioSource = cube.AddComponent<AudioSource>();
        HumeEVI evi = cube.AddComponent<HumeEVI>();
        evi.audioSource = audioSource;
        evi.SetApiKey(humeApiKey);

        // Add visual feedback component
        ConversationVisualFeedback visualFeedback = cube.AddComponent<ConversationVisualFeedback>();
        visualFeedback.Initialize(evi, renderer);

        cubeBody.AddComponent<ClickToConverse>();

        // Add instruction text
        GameObject textObject = new GameObject("InstructionText");
        TextMesh textMesh = textObject.AddComponent<TextMesh>();
        textMesh.text = "Tap to start a conversation!";
        textMesh.fontSize = 20;
        textMesh.color = Color.white;
        textMesh.anchor = TextAnchor.MiddleCenter;
        textObject.transform.position = new Vector3(0, -2, 0);
        textObject.transform.localScale = new Vector3(0.1f, 0.1f, 0.1f);

        // Store reference to text for updates
        visualFeedback.instructionText = textMesh;

        // Ensure we have a camera
        Camera mainCamera = Camera.main;
        if (mainCamera == null)
        {
            GameObject cameraObj = new GameObject("Main Camera");
            mainCamera = cameraObj.AddComponent<Camera>();
            cameraObj.tag = "MainCamera";
            cameraObj.AddComponent<AudioListener>();
            Debug.Log("Created Main Camera");
        }

        mainCamera.transform.position = new Vector3(0, 1, -5);
        mainCamera.transform.LookAt(cube.transform);

        Debug.Log("Conversation Cube created! Click the cube to start a conversation with EVI.");
    }
}

/// <summary>
/// Handles visual feedback for conversation states.
/// Changes cube color and updates instruction text based on EVI state.
/// </summary>
public class ConversationVisualFeedback : MonoBehaviour
{
    private HumeEVI evi;
    private Renderer cubeRenderer;
    private Material material;

    public TextMesh instructionText;

    // State colors
    private readonly Color idleColor = Color.gray;
    private readonly Color connectingColor = Color.yellow;
    private readonly Color listeningColor = new Color(0.2f, 0.8f, 0.2f); // Green
    private readonly Color speakingColor = new Color(0.2f, 0.4f, 1f);    // Blue

    // Animation
    private float pulseTime = 0f;
    private float pulseSpeed = 2f;
    private float pulseIntensity = 0.3f;
    private HumeEVI.ConversationState currentState = HumeEVI.ConversationState.Idle;

    // Rotation
    private float baseSpinSpeed = 45f;

    public void Initialize(HumeEVI eviComponent, Renderer renderer)
    {
        evi = eviComponent;
        cubeRenderer = renderer;
        material = cubeRenderer.material;

        // Subscribe to EVI events
        evi.OnStateChanged += OnStateChanged;
    }

    void OnDestroy()
    {
        if (evi != null)
        {
            evi.OnStateChanged -= OnStateChanged;
        }
    }

    void Update()
    {
        // Rotate the cube
        float spinSpeed = currentState == HumeEVI.ConversationState.Speaking ? baseSpinSpeed * 2f : baseSpinSpeed;
        transform.Rotate(Vector3.up * spinSpeed * Time.deltaTime);
        transform.Rotate(Vector3.right * spinSpeed * 0.3f * Time.deltaTime);

        // Animate color based on state
        AnimateColor();

        // Update instruction text continuously for mic status (only in Listening state)
        if (currentState == HumeEVI.ConversationState.Listening)
        {
            UpdateInstructionText();
        }
    }

    private void AnimateColor()
    {
        Color baseColor = GetBaseColorForState(currentState);

        if (currentState == HumeEVI.ConversationState.Idle)
        {
            material.color = baseColor;
            return;
        }

        // Pulse effect for active states
        pulseTime += Time.deltaTime * pulseSpeed;
        float pulse = (Mathf.Sin(pulseTime) + 1f) / 2f; // 0 to 1

        Color targetColor = Color.Lerp(baseColor, Color.white, pulse * pulseIntensity);
        material.color = targetColor;
    }

    private Color GetBaseColorForState(HumeEVI.ConversationState state)
    {
        switch (state)
        {
            case HumeEVI.ConversationState.Connecting:
                return connectingColor;
            case HumeEVI.ConversationState.Listening:
                return listeningColor;
            case HumeEVI.ConversationState.Speaking:
                return speakingColor;
            default:
                return idleColor;
        }
    }

    private void OnStateChanged(HumeEVI.ConversationState newState)
    {
        currentState = newState;
        pulseTime = 0f; // Reset pulse animation

        UpdateInstructionText();
    }

    private void UpdateInstructionText()
    {
        if (instructionText == null) return;

        switch (currentState)
        {
            case HumeEVI.ConversationState.Idle:
                instructionText.text = "Tap to start a conversation!";
                instructionText.color = Color.white;
                break;
            case HumeEVI.ConversationState.Connecting:
                instructionText.text = "Connecting to EVI...";
                instructionText.color = connectingColor;
                break;
            case HumeEVI.ConversationState.Listening:
                // Check if mic is actually active
                if (evi != null && evi.IsMicrophoneActive)
                {
                    instructionText.text = "Listening... (Tap to stop)";
                }
                else
                {
                    instructionText.text = "Ready (Tap to stop)";
                }
                instructionText.color = listeningColor;
                break;
            case HumeEVI.ConversationState.Speaking:
                instructionText.text = "EVI is speaking... (Tap to stop)";
                instructionText.color = speakingColor;
                break;
        }
    }
}

/// <summary>
/// Handles click/touch interaction to start/stop EVI conversation.
/// Tap anywhere on screen to toggle conversation.
/// </summary>
public class ClickToConverse : MonoBehaviour
{
    private HumeEVI evi;

    void Start()
    {
        evi = GetComponentInParent<HumeEVI>();
    }

    void Update()
    {
        // Handle touch input (mobile)
        if (Input.touchCount > 0)
        {
            Touch touch = Input.GetTouch(0);
            if (touch.phase == TouchPhase.Began)
            {
                OnTap();
            }
        }
        // Handle mouse input (editor/desktop)
        else if (Input.GetMouseButtonDown(0))
        {
            OnTap();
        }
    }

    private void OnTap()
    {
        Debug.Log("Screen tapped!");
        if (evi != null)
        {
            if (evi.IsConversationActive)
            {
                evi.StopConversation();
            }
            else
            {
                evi.StartConversation();
            }
        }
    }
}
