//
//  TTSView.swift
//  HumeDemo
//
//  Created by Chris on 6/26/25.
//

import SwiftUI
import Hume

struct TTSView: View {
    
    enum Field: Hashable {
        case text
        case voiceDescription
    }
    
    @EnvironmentObject var model: TTSModel
    
    // MARK: - State
    @State private var text: String = ""
    @State private var voiceDescription: String = ""
    @State private var speed: Double = 1.0
    @State private var trailingSilence: Double = 0.35
    
    @State private var showSettings: Bool = true
        
    @FocusState private var focusedField: Field?
    
    // MARK: - View
    var body: some View {
        VStack {
            List {
                ForEach(model.events, id: \.self) { event in
                    TTSEventView(event: event)
                        .flippedUpsideDown()
                        .padding(.vertical)
                }
                .listRowSeparator(.hidden)
                .listRowInsets(EdgeInsets())
            }
            .listStyle(.plain)
            .flippedUpsideDown()
            .frame(maxHeight: .infinity)
            .padding()
            .background(.secondary.opacity(0.05))
            
            Divider()
            
            VStack {
                TextField("Text to speak...", text: $text)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                        .focused($focusedField, equals: .text)
                        .submitLabel(.next)
                        .onSubmit { focusedField = .voiceDescription }
                        .disabled(model.isSubmitting)

                
                TextField("Voice Description...", text: $voiceDescription)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .focused($focusedField, equals: .voiceDescription)
                    .submitLabel(.done)
                    .onSubmit { focusedField = nil }
                    .disabled(model.isSubmitting)
                
                Divider()
                
                VStack {
                    Button {
                        withAnimation {
                            showSettings.toggle()
                        }
                    } label: {
                        Image(systemName: "arrowtriangle.\(showSettings ? "down" : "up").fill")
                            .padding(8)
                            .background(.black.opacity(0.1))
                            .clipShape(.circle)
                    }

                    bottomControls
                        .disabled(model.isSubmitting)
                }
            }
            .padding()
            .background(.primary.opacity(0.15), ignoresSafeAreaEdges: .all)
            
        }

        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    
    private var submitRow: some View {
        HStack {
            Button {
                submitTts(model.selectedEndpoint, mode: model.selectedTTSMode, format: model.selectedFormat)
            } label: {
                Group {
                    if !model.isSubmitting {
                        Text("Submit")
                            .font(.headline)
                    } else {
                        ProgressView()
                    }
                }
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(.blue)
                    .clipShape(.buttonBorder)
            }
            
            Spacer()
            
            Button("Clear") {
                text = ""
                voiceDescription = ""
            }
            .padding()
            .buttonStyle(.borderless)
            .disabled(model.isSubmitting)
        }
    }
    
    private var bottomControls: some View {
        VStack(spacing: 12) {
            if showSettings {
                Group {
                    HStack {
                        modePicker
                        endpointPicker
                    }
                    formatPicker
                    
                    HStack(spacing: 16) {
                        speedControl
                        trailingSilenceControl
                    }
                    .padding(8)
                }
                .transition(.asymmetric(insertion: .move(edge: .top).combined(with: .opacity),
                                        removal: .move(edge: .bottom).combined(with: .opacity)))
            }
            
            submitRow
        }
    }
    
    private var modePicker: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading) {
                Text("Mode").bold()
                Picker("Mode", selection: $model.selectedTTSMode) {
                    ForEach(TTSModel.TTSMode.allCases) { format in
                        Text(format.rawValue.capitalized).tag(format)
                    }
                }
                .pickerStyle(.segmented)
            }
        }
    }
    
    private var formatPicker: some View {
        VStack(alignment: .leading) {
            Text("Format").bold()
            Picker("Format", selection: $model.selectedOutputFormat) {
                ForEach(TTSModel.OutputFormat.allCases) { format in
                    Text(format.rawValue.capitalized).tag(format)
                }
            }
            .pickerStyle(.segmented)
        }
    }
    
    private var endpointPicker: some View {
        VStack(alignment: .leading) {
            Text("Endpoint").bold()
            Picker("Endpoint", selection: $model.selectedEndpoint) {
                ForEach(TTSModel.TTSType.allCases) { format in
                    Text(format.rawValue.capitalized).tag(format)
                }
            }
            .pickerStyle(.segmented)
        }
    }
    
    private var speedControl: some View {
        VStack(alignment: .leading) {
            Text("Speed: \(String(format: "%.2f", speed))").bold()
                .font(.caption)
            Slider(value: $speed, in: 0.25...3, step: 0.01) {
                Text("Speed")
            } minimumValueLabel: {
                Text("0.25")
            } maximumValueLabel: {
                Text("3.0")
            }
        }
    }
    
    private var trailingSilenceControl: some View {
        VStack(alignment: .leading) {
            Text("Trailing Silence: \(String(format: "%.2f", trailingSilence))").bold()
                .font(.caption)
            Slider(value: $trailingSilence, in: 0...5, step: 0.01) {
                Text("Trailing Silence")
            } minimumValueLabel: {
                Text("0.0")
            } maximumValueLabel: {
                Text("5.0")
            }
        }
    }
    
    // MARK: - Handlers
    
    private func submitTts(_ ttsType: TTSModel.TTSType, mode: TTSModel.TTSMode, format: Format) {
        guard !text.isEmpty else { return }
        
        let submitFunction = switch mode {
            case .synchronous:
            switch ttsType {
                case .json: model.postSynchronousJson
                case .file: model.postSynchronousFile
            }
        case .stream:
            switch ttsType {
                case .json: model.streamJson
                case .file: model.streamFile
            }
        }
        
        Task {
            do {
                try await submitFunction(text, voiceDescription, speed, trailingSilence, format)
            } catch {
                print("Error: \(error)")
            }
        }
    }
}

// MARK: - Previews

#if DEBUG
struct TTSView_Previews: PreviewProvider {
    static var previews: some View {
        return TTSView()
            .environmentObject(TTSModel())
    }
}
#endif
